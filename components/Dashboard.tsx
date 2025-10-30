import React, { useState, useMemo } from 'react';
import { Product, Affiliate, Sale, User, UserRole, SaleStatus } from '../types';
import SalesChart from './SalesChart';

interface DashboardProps {
  user: User;
  products: Product[];
  affiliates: Affiliate[];
  sales: Sale[];
}

type AffiliatePerformance = {
    id: string;
    name: string;
    totalRevenue: number;
    totalSalesCount: number;
    totalCommissions: number;
};

const StatCard: React.FC<{ title: string; value: string | number; color: string }> = ({ title, value, color }) => (
    <div className="bg-surface p-6 rounded-xl shadow-md flex flex-col">
        <h3 className="text-lg font-semibold text-gray-500">{title}</h3>
        <p className={`text-4xl font-bold mt-2 ${color}`}>{value}</p>
    </div>
);

type TimePeriod = 'today' | 'yesterday' | '7d' | '30d' | 'all';

const SortArrow: React.FC<{ direction?: 'ascending' | 'descending' }> = ({ direction }) => {
  if (!direction) {
    return (
      <svg className="w-3 h-3 inline-block ml-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
      </svg>
    );
  }
  if (direction === 'ascending') {
    return (
      <svg className="w-3 h-3 inline-block ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    );
  }
  return (
    <svg className="w-3 h-3 inline-block ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ user, products, affiliates, sales }) => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');
  const [sortConfig, setSortConfig] = useState<{ key: keyof AffiliatePerformance; direction: 'ascending' | 'descending' }>({ key: 'totalRevenue', direction: 'descending' });

  const isAffiliateView = user.role === UserRole.AFFILIATE;
  const isLogisticsView = user.role === UserRole.LOGISTICS;
  const isCustomerCareView = user.role === UserRole.CUSTOMER_CARE;

  const filteredSales = useMemo(() => {
    let salesToFilter: Sale[];

    if (isAffiliateView) {
        const relevantStatuses: SaleStatus[] = ['Svincolato', 'Consegnato', 'In attesa', 'Confermato', 'Spedito', 'Giacenza'];
        salesToFilter = sales.filter(s => relevantStatuses.includes(s.status));
    } else if (isLogisticsView) {
      const relevantStatuses: SaleStatus[] = ['Confermato', 'Spedito', 'Consegnato', 'Svincolato', 'Non ritirato', 'Giacenza'];
      salesToFilter = sales.filter(s => relevantStatuses.includes(s.status));
    } else if (isCustomerCareView) {
      const relevantStatuses: SaleStatus[] = ['In attesa', 'Contattato', 'Confermato', 'Cancellato', 'Non raggiungibile', 'Consegnato', 'Giacenza'];
      salesToFilter = sales.filter(s => relevantStatuses.includes(s.status));
    } else { // This is for ADMIN and MANAGER
      const excludedStatuses: SaleStatus[] = ['Annullato', 'Cancellato', 'Duplicato', 'Test'];
      salesToFilter = sales.filter(s => !excludedStatuses.includes(s.status));
    }
    
    if (timePeriod === 'all') return salesToFilter;
    
    const now = new Date();
    const startDate = new Date(now);
    const endDate = new Date(now);

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    switch (timePeriod) {
        case 'today':
            // start and end are already set for today
            break;
        case 'yesterday':
            startDate.setDate(startDate.getDate() - 1);
            endDate.setDate(endDate.getDate() - 1);
            break;
        case '7d':
            startDate.setDate(startDate.getDate() - 6);
            break;
        case '30d':
            startDate.setDate(startDate.getDate() - 29);
            break;
    }

    return salesToFilter.filter(sale => {
        const saleDate = new Date(sale.saleDate);
        return saleDate >= startDate && saleDate <= endDate;
    });
  }, [sales, timePeriod, isLogisticsView, isAffiliateView, isCustomerCareView]);

  const { 
    totalRevenue, 
    totalCommissions, 
    totalSalesCount,
    approvedCommissions,
    pendingCommissions
   } = useMemo(() => {
    if (isAffiliateView) {
        const approvedStatuses: SaleStatus[] = ['Svincolato', 'Consegnato'];
        const pendingStatuses: SaleStatus[] = ['In attesa', 'Confermato', 'Spedito', 'Giacenza'];
        
        const approved = filteredSales
            .filter(s => approvedStatuses.includes(s.status))
            .reduce((sum, sale) => sum + sale.commissionAmount, 0);
        
        const pending = filteredSales
            .filter(s => pendingStatuses.includes(s.status))
            .reduce((sum, sale) => sum + sale.commissionAmount, 0);

        return { 
            approvedCommissions: approved,
            pendingCommissions: pending,
            totalSalesCount: filteredSales.length,
            totalRevenue: 0,
            totalCommissions: 0,
        };
    }

    return {
        approvedCommissions: 0,
        pendingCommissions: 0,
        totalRevenue: filteredSales.reduce((sum, sale) => sum + sale.saleAmount, 0),
        totalCommissions: filteredSales.reduce((sum, sale) => sum + sale.commissionAmount, 0),
        totalSalesCount: filteredSales.length,
    };
  }, [filteredSales, isAffiliateView]);


  const { totalCosts, netProfit } = useMemo(() => {
    if (isAffiliateView || isLogisticsView || isCustomerCareView) return { totalCosts: 0, netProfit: 0 };
    
    let operationalCosts = 0;
    for (const sale of filteredSales) {
        const product = products.find(p => p.id === sale.productId);
        if (product) {
            const quantity = sale.quantity || 1;
            
            const perUnitCosts = (product.costOfGoods || 0) + (product.shippingCost || 0) + (product.fulfillmentCost || 0);

            operationalCosts += (perUnitCosts * quantity);
        }
    }
    
    const totalPlatformCosts = operationalCosts + totalCommissions;
    const profit = totalRevenue - totalPlatformCosts;
    return { totalCosts: totalPlatformCosts, netProfit: profit };
  }, [filteredSales, products, totalRevenue, totalCommissions, isAffiliateView, isLogisticsView, isCustomerCareView]);

  const logisticsStats = useMemo(() => {
    if (!isLogisticsView) return { managedOrders: 0, totalFulfillmentCommissions: 0, ordersToShip: 0 };

    const managedOrders = filteredSales.length;
    
    const totalFulfillmentCommissions = filteredSales
      .filter(s => s.status === 'Consegnato')
      .reduce((sum, sale) => {
        const product = products.find(p => p.id === sale.productId);
        return sum + (product?.fulfillmentCost || 0);
      }, 0);

    const ordersToShip = sales.filter(s => s.status === 'Confermato').length; // Check all sales for this metric

    return { managedOrders, totalFulfillmentCommissions, ordersToShip };
  }, [filteredSales, products, isLogisticsView, sales]);
  
  const customerCareStats = useMemo(() => {
    if (!isCustomerCareView) return { earnedCommissions: 0, handledOrders: 0, toContactOrders: 0 };

    const earnedCommissions = filteredSales
      .filter(s => s.status === 'Consegnato')
      .reduce((sum, sale) => {
        const product = products.find(p => p.id === sale.productId);
        if (!product) return sum;
        const commission = product.customerCareCommission || 0;
        return sum + commission;
      }, 0);

    const handledOrders = filteredSales.filter(s => ['Contattato', 'Confermato', 'Cancellato', 'Non raggiungibile'].includes(s.status)).length;
    const toContactOrders = sales.filter(s => s.status === 'In attesa').length; // Check all sales for this metric

    return { earnedCommissions, handledOrders, toContactOrders };
  }, [filteredSales, products, isCustomerCareView, sales]);

  const chartSalesData = useMemo(() => {
    if (isLogisticsView || isCustomerCareView) {
      // For logistics, chart shows number of orders managed
      return filteredSales.map(sale => ({ ...sale, saleAmount: 1 }));
    }
    if (isAffiliateView) {
        // For affiliate, chart shows commission amount
        return filteredSales.map(sale => ({ ...sale, saleAmount: sale.commissionAmount }));
    }
    return filteredSales;
  }, [filteredSales, isLogisticsView, isAffiliateView, isCustomerCareView]);
  
  const chartGranularity = useMemo(() => {
    return (timePeriod === 'today' || timePeriod === 'yesterday') ? 'hour' : 'day';
  }, [timePeriod]);

  const topProducts = useMemo(() => {
    const salesSource = filteredSales;
    const productSales: { [key: string]: { name: string; total: number; count: number; totalQuantity: number; imageUrl: string } } = {};
    for (const sale of salesSource) {
        if (!productSales[sale.productId]) {
            const product = products.find(p => p.id === sale.productId);
            productSales[sale.productId] = { name: sale.productName, total: 0, count: 0, totalQuantity: 0, imageUrl: product?.imageUrl || '' };
        }
        productSales[sale.productId].total += isLogisticsView || isCustomerCareView ? 1 : (isAffiliateView ? sale.commissionAmount : sale.saleAmount);
        productSales[sale.productId].count += 1;
        productSales[sale.productId].totalQuantity += sale.quantity || 1;
    }
    return Object.values(productSales).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [filteredSales, products, isLogisticsView, isAffiliateView, isCustomerCareView]);
  
  const requestSort = (key: keyof AffiliatePerformance) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedAffiliatePerformance = useMemo(() => {
    if (isAffiliateView || isLogisticsView || isCustomerCareView) return [];

    const performance: { [id: string]: AffiliatePerformance } = {};

    for (const sale of filteredSales) {
        if (!performance[sale.affiliateId]) {
            performance[sale.affiliateId] = {
                id: sale.affiliateId,
                name: sale.affiliateName,
                totalRevenue: 0,
                totalSalesCount: 0,
                totalCommissions: 0,
            };
        }
        performance[sale.affiliateId].totalRevenue += sale.saleAmount;
        performance[sale.affiliateId].totalSalesCount += 1;
        performance[sale.affiliateId].totalCommissions += sale.commissionAmount;
    }

    const performanceArray = Object.values(performance);
    
    performanceArray.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
    });

    return performanceArray;
  }, [filteredSales, isAffiliateView, isLogisticsView, isCustomerCareView, sortConfig]);

  const getSortDirection = (key: keyof AffiliatePerformance) => {
      return sortConfig.key === key ? sortConfig.direction : undefined;
  }

  const getDashboardTitle = () => {
    if (isAffiliateView) return 'La Tua Dashboard';
    if (isLogisticsView) return 'Dashboard Logistica';
    if (isCustomerCareView) return 'Dashboard Customer Care';
    return 'Dashboard';
  }

  const periodLabels: Record<TimePeriod, string> = {
    'today': 'Oggi',
    'yesterday': 'Ieri',
    '7d': 'Ultimi 7 Giorni',
    '30d': 'Ultimi 30 Giorni',
    'all': 'Sempre'
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-on-surface">{getDashboardTitle()}</h2>
        <div className="flex flex-wrap items-center justify-start md:justify-end gap-2 bg-surface p-1 rounded-lg shadow-sm">
            {(['today', 'yesterday', '7d', '30d', 'all'] as TimePeriod[]).map(period => (
                <button key={period} onClick={() => setTimePeriod(period)} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${timePeriod === period ? 'bg-primary text-on-primary shadow' : 'text-gray-600 hover:bg-gray-200'}`}>
                    {periodLabels[period]}
                </button>
            ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {isLogisticsView ? (
            <>
              <StatCard title="Commissioni Logistica" value={`€${logisticsStats.totalFulfillmentCommissions.toFixed(2)}`} color="text-indigo-600" />
              <StatCard title="Ordini Gestiti" value={logisticsStats.managedOrders} color="text-blue-600" />
              <StatCard title="Ordini da Spedire" value={logisticsStats.ordersToShip} color="text-yellow-600" />
            </>
          ) : isAffiliateView ? (
            <>
              <StatCard title="Commissione Approvata" value={`€${approvedCommissions.toFixed(2)}`} color="text-green-600" />
              <StatCard title="Commissione in Pending" value={`€${pendingCommissions.toFixed(2)}`} color="text-yellow-600" />
              <StatCard title="Vendite Totali" value={totalSalesCount} color="text-indigo-600" />
            </>
          ) : isCustomerCareView ? (
            <>
              <StatCard title="Commissioni Guadagnate" value={`€${customerCareStats.earnedCommissions.toFixed(2)}`} color="text-green-600" />
              <StatCard title="Ordini Gestiti" value={customerCareStats.handledOrders} color="text-blue-600" />
              <StatCard title="Ordini da Contattare" value={customerCareStats.toContactOrders} color="text-yellow-600" />
            </>
          ) : (
            <>
              <StatCard title="Fatturato" value={`€${totalRevenue.toFixed(2)}`} color="text-green-600" />
              <StatCard title="Costi Totali" value={`€${totalCosts.toFixed(2)}`} color="text-red-600" />
              <StatCard title="Profitto Netto" value={`€${netProfit.toFixed(2)}`} color={netProfit >= 0 ? "text-blue-600" : "text-red-600"} />
              <StatCard title="Commissioni Affiliati" value={`€${totalCommissions.toFixed(2)}`} color="text-yellow-600" />
              <StatCard title="Vendite" value={totalSalesCount} color="text-indigo-600" />
              <StatCard title="Affiliati Attivi" value={affiliates.filter(a => !a.isBlocked).length} color="text-purple-600" />
            </>
          )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 bg-surface p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-on-surface mb-4">{isLogisticsView || isCustomerCareView ? 'Andamento Ordini Gestiti' : isAffiliateView ? 'Andamento Commissioni' : 'Andamento Fatturato'}</h3>
            <div className="h-80">
                <SalesChart sales={chartSalesData} granularity={chartGranularity} />
            </div>
        </div>
        <div className="lg:col-span-2 bg-surface p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-on-surface mb-4">{isAffiliateView ? 'Prodotti più redditizi (commissioni)' : isLogisticsView || isCustomerCareView ? 'Prodotti più Movimentati' : 'Prodotti più Venduti'}</h3>
            <ul className="space-y-4">
                {topProducts.map((product, index) => (
                    <li key={index} className="flex items-center gap-4">
                        <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded-md object-cover" />
                        <div className="flex-grow">
                            <p className="font-semibold text-sm">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.count} {isLogisticsView || isCustomerCareView ? 'ordini' : 'vendite'}</p>
                        </div>
                        <p className="font-bold text-green-600 text-sm">
                            {isLogisticsView || isCustomerCareView ? `${product.totalQuantity} Unità` : `€${product.total.toFixed(2)}`}
                        </p>
                    </li>
                ))}
                {topProducts.length === 0 && (
                    <p className="text-center text-gray-500 py-4">Nessun dato disponibile per questo periodo.</p>
                )}
            </ul>
        </div>
      </div>
      
      {!isAffiliateView && !isLogisticsView && !isCustomerCareView && (
        <div className="mt-8 bg-surface p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-on-surface mb-4">Performance Affiliati ({periodLabels[timePeriod]})</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('name')}>
                                Affiliato <SortArrow direction={getSortDirection('name')} />
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('totalRevenue')}>
                                Fatturato <SortArrow direction={getSortDirection('totalRevenue')} />
                            </th>
                             <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('totalSalesCount')}>
                                Vendite <SortArrow direction={getSortDirection('totalSalesCount')} />
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('totalCommissions')}>
                                Commissioni <SortArrow direction={getSortDirection('totalCommissions')} />
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedAffiliatePerformance.map((aff) => (
                        <tr key={aff.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{aff.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">€{aff.totalRevenue.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{aff.totalSalesCount}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">€{aff.totalCommissions.toFixed(2)}</td>
                        </tr>
                        ))}
                    </tbody>
                </table>
                 {sortedAffiliatePerformance.length === 0 && (
                    <p className="text-center text-gray-500 py-8">Nessuna performance da mostrare per il periodo selezionato.</p>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;