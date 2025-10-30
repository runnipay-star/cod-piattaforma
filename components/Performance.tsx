import React, { useState, useMemo, useEffect } from 'react';
import { Sale, Product, Affiliate, User, UserRole, SaleStatus } from '../types';
import SalesChart from './SalesChart';
import { FilterIcon } from './icons/FilterIcon';
import SearchableSelect from './SearchableSelect';
import { RefreshIcon } from './icons/RefreshIcon';

const StatCard: React.FC<{ 
    title: string; 
    value?: string | number; 
    color?: string;
    primaryValue?: { label: string; value: string | number; color: string; };
    secondaryValue?: { label: string; value: string | number; color: string; };
}> = ({ title, value, color, primaryValue, secondaryValue }) => (
    <div className="bg-surface p-4 rounded-xl shadow-md flex flex-col">
        <h3 className="text-base font-semibold text-gray-500">{title}</h3>
        {value !== undefined && color && (
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        )}
        {primaryValue && (
             <div className="mt-2 space-y-1">
                <div className="flex justify-between items-baseline">
                    <span className={`text-sm font-medium ${primaryValue.color}`}>{primaryValue.label}</span>
                    <span className={`text-xl font-bold ${primaryValue.color}`}>{primaryValue.value}</span>
                </div>
                {secondaryValue && (
                    <div className="flex justify-between items-baseline">
                        <span className={`text-sm font-medium ${secondaryValue.color}`}>{secondaryValue.label}</span>
                        <span className={`text-lg font-semibold ${secondaryValue.color}`}>{secondaryValue.value}</span>
                    </div>
                )}
            </div>
        )}
    </div>
);

type TimePeriod = 'custom' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'last_year';

const getPeriodRange = (period: TimePeriod, customStart?: string, customEnd?: string): [Date, Date] => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);

    switch (period) {
        case 'custom':
            start = customStart ? new Date(customStart) : new Date(0);
            end = customEnd ? new Date(customEnd) : new Date();
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'today':
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'yesterday':
            start.setDate(start.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            end.setDate(end.getDate() - 1);
            end.setHours(23, 59, 59, 999);
            break;
        case 'this_week':
            const dayOfWeek = now.getDay();
            const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            start.setDate(diff);
            start.setHours(0, 0, 0, 0);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            break;
        case 'this_month':
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(end.getMonth() + 1);
            end.setDate(0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'last_month':
            start.setMonth(start.getMonth() - 1);
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setDate(0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'this_year':
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(11, 31);
            end.setHours(23, 59, 59, 999);
            break;
        case 'last_year':
            const lastYear = now.getFullYear() - 1;
            start.setFullYear(lastYear, 0, 1);
            start.setHours(0, 0, 0, 0);
            end.setFullYear(lastYear, 11, 31);
            end.setHours(23, 59, 59, 999);
            break;
    }
    return [start, end];
};

interface PerformanceProps {
    user: User;
    sales: Sale[];
    products: Product[];
    affiliates: Affiliate[];
    onRefreshData: () => Promise<void>;
}

const ALL_STATUSES_FOR_FILTER: SaleStatus[] = ['In attesa', 'Contattato', 'Confermato', 'Annullato', 'Cancellato', 'Spedito', 'Svincolato', 'Consegnato', 'Duplicato', 'Non raggiungibile', 'Non ritirato', 'Giacenza'];

const initialFilterState = {
    timePeriod: 'this_month' as TimePeriod,
    customStartDate: '',
    customEndDate: '',
    selectedProductId: 'all',
    selectedAffiliateId: 'all',
    subIdQuery: '',
    selectedStatuses: [] as SaleStatus[],
};

const LOGISTICS_INITIAL_STATUSES: SaleStatus[] = ['Confermato', 'Spedito', 'Consegnato', 'Svincolato', 'Non ritirato', 'Giacenza'];
const AFFILIATE_DEFAULT_STATUSES: SaleStatus[] = ['In attesa', 'Confermato', 'Spedito', 'Svincolato', 'Consegnato', 'Giacenza'];
const ADMIN_MANAGER_DEFAULT_STATUSES: SaleStatus[] = ['Svincolato', 'Consegnato'];

const FILTERS_STORAGE_KEY = 'performanceFilters';

const Performance: React.FC<PerformanceProps> = ({ user, sales, products, affiliates, onRefreshData }) => {
    const isAffiliateView = user.role === UserRole.AFFILIATE;
    const isLogisticsView = user.role === UserRole.LOGISTICS;
    const isCustomerCareView = user.role === UserRole.CUSTOMER_CARE;
    const canToggleStatusFilters = user.role === UserRole.ADMIN || user.role === UserRole.MANAGER || isAffiliateView || isCustomerCareView;
    
    const getDefaultStatuses = () => {
        if (isLogisticsView) return LOGISTICS_INITIAL_STATUSES;
        if (isCustomerCareView) return ['In attesa', 'Contattato', 'Confermato', 'Cancellato', 'Non raggiungibile', 'Giacenza'];
        // Default for Admin/Manager/Affiliate is OFF (empty array)
        return [];
    };

    const [filters, setFilters] = useState(() => {
        const baseInitialState = { ...initialFilterState, selectedStatuses: getDefaultStatuses() };
        try {
            const savedFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
            if (savedFilters) {
                const parsed = JSON.parse(savedFilters);
                return { ...baseInitialState, ...parsed };
            }
        } catch (error) {
            console.error("Failed to parse filters from localStorage", error);
        }
        return baseInitialState;
    });

    const [showStatusFilters, setShowStatusFilters] = useState(canToggleStatusFilters ? (filters.selectedStatuses.length > 0) : false);
    const [isFilterVisible, setIsFilterVisible] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    useEffect(() => {
        if (canToggleStatusFilters) {
            if (showStatusFilters) {
                // If toggled on and no statuses are selected, select default statuses for the role
                if (filters.selectedStatuses.length === 0) {
                     const defaultStatuses = isAffiliateView ? AFFILIATE_DEFAULT_STATUSES : isCustomerCareView ? getDefaultStatuses() : ADMIN_MANAGER_DEFAULT_STATUSES;
                     handleFilterChange('selectedStatuses', defaultStatuses);
                }
            } else {
                // If toggled off, clear selected statuses
                 handleFilterChange('selectedStatuses', []);
            }
        }
    }, [showStatusFilters, canToggleStatusFilters, isAffiliateView, isCustomerCareView]);

    useEffect(() => {
        try {
            localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
        } catch (error) {
            console.error("Failed to save filters to localStorage", error);
        }
    }, [filters]);

    const productOptions = useMemo(() => [
        { value: 'all', label: 'Tutti i Prodotti' },
        ...products.map(p => ({ value: p.id, label: p.name, refNumber: p.refNumber }))
    ], [products]);


    const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
        setFilters(prev => {
            const newFilters = { ...prev, [filterName]: value };
            if (filterName === 'timePeriod' && value !== 'custom') {
                newFilters.customStartDate = '';
                newFilters.customEndDate = '';
            }
            return newFilters;
        });
    };
    
    const handleStatusToggle = (status: SaleStatus) => {
        setFilters(prev => {
            const newStatuses = prev.selectedStatuses.includes(status)
                ? prev.selectedStatuses.filter(s => s !== status)
                : [...prev.selectedStatuses, status];
            return { ...prev, selectedStatuses: newStatuses };
        });
    };

    const resetFilters = () => {
        setShowStatusFilters(false);
        setFilters({ ...initialFilterState, selectedStatuses: getDefaultStatuses() });
    }

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await onRefreshData();
        setIsRefreshing(false);
    };

    const finalFilteredSales = useMemo(() => {
        const [start, end] = getPeriodRange(filters.timePeriod, filters.customStartDate, filters.customEndDate);
        const subIdQuery = filters.subIdQuery.toLowerCase().trim();

        let filtered = sales.filter(sale => {
            if (sale.status === 'Test') return false; // Exclude test orders from performance stats
            
            const saleDate = new Date(sale.saleDate);
            if (saleDate < start || saleDate > end) return false;
            if (filters.selectedProductId !== 'all' && sale.productId !== filters.selectedProductId) return false;
            if (!isAffiliateView && !isLogisticsView && !isCustomerCareView && filters.selectedAffiliateId !== 'all' && sale.affiliateId !== filters.selectedAffiliateId) return false;
            if (subIdQuery) {
                if (!sale.subId || !sale.subId.toLowerCase().trim().includes(subIdQuery)) {
                    return false;
                }
            }
            return true;
        });

        // Apply status filter only if there are statuses selected.
        if (filters.selectedStatuses.length > 0) {
            filtered = filtered.filter(sale => filters.selectedStatuses.includes(sale.status));
        }
        
        return filtered;
    }, [sales, isAffiliateView, isLogisticsView, isCustomerCareView, filters]);
    
    const statusCounts = useMemo(() => {
        const [start, end] = getPeriodRange(filters.timePeriod, filters.customStartDate, filters.customEndDate);
        const baseFiltered = sales.filter(sale => {
            const saleDate = new Date(sale.saleDate);
            return saleDate >= start && saleDate <= end;
        });
        const counts: { [key in SaleStatus]?: number } = {};
        for (const sale of baseFiltered) {
            counts[sale.status] = (counts[sale.status] || 0) + 1;
        }
        return counts;
    }, [sales, filters.timePeriod, filters.customStartDate, filters.customEndDate]);

    const stats = useMemo(() => {
        const nonCommissionableStatuses: SaleStatus[] = ['Annullato', 'Cancellato', 'Duplicato', 'Test'];
        const commissionableSales = finalFilteredSales.filter(s => !nonCommissionableStatuses.includes(s.status));

        if (isAffiliateView) {
            const approvedStatuses: SaleStatus[] = ['Svincolato', 'Consegnato'];
            const pendingStatuses: SaleStatus[] = ['In attesa', 'Confermato', 'Spedito', 'Giacenza'];
            
            const approvedCommissions = commissionableSales
                .filter(s => approvedStatuses.includes(s.status))
                .reduce((sum, sale) => sum + sale.commissionAmount, 0);

            const pendingCommissions = commissionableSales
                .filter(s => pendingStatuses.includes(s.status))
                .reduce((sum, sale) => sum + sale.commissionAmount, 0);
            
            const totalSalesCount = approvedCommissions > 0 || pendingCommissions > 0 
                ? commissionableSales.filter(s => [...approvedStatuses, ...pendingStatuses].includes(s.status)).length
                : commissionableSales.length;

            const deliveredSales = commissionableSales.filter(s => s.status === 'Consegnato').length;
            const approvalRate = totalSalesCount > 0 ? (deliveredSales / totalSalesCount) * 100 : 0;

            return {
                approvedCommissions, pendingCommissions, totalSalesCount: totalSalesCount, approvalRate,
            };
        }

        if (isCustomerCareView) {
            const confirmedStatus: SaleStatus = 'Consegnato';
            const pendingStatuses: SaleStatus[] = ['In attesa', 'Contattato', 'Confermato', 'Spedito', 'Giacenza'];

            let confirmedCommissions = 0;
            let pendingCommissions = 0;

            commissionableSales.forEach(sale => {
                const productData = products.find(p => p.id === sale.productId);
                if (!productData) return;
                const commission = productData.customerCareCommission || 0;

                if (sale.status === confirmedStatus) {
                    confirmedCommissions += commission;
                } else if (pendingStatuses.includes(sale.status)) {
                    pendingCommissions += commission;
                }
            });

            const confirmedCount = commissionableSales.filter(s => s.status === 'Confermato').length;
            const cancelledCount = finalFilteredSales.filter(s => s.status === 'Cancellato').length; // Use finalFilteredSales to include cancellations in conversion rate
            const conversionRate = (confirmedCount + cancelledCount) > 0 ? (confirmedCount / (confirmedCount + cancelledCount)) * 100 : 0;
            
            return {
                confirmedCommissions, pendingCommissions,
                totalOrdersHandled: commissionableSales.length,
                conversionRate
            };
        }

        const confirmedStatus: SaleStatus = 'Consegnato';
        const pendingStatuses: SaleStatus[] = ['In attesa', 'Confermato', 'Spedito', 'Svincolato', 'Giacenza'];

        let confirmedRevenue = 0, pendingRevenue = 0;
        let confirmedAffiliateCommissions = 0, pendingAffiliateCommissions = 0;
        let confirmedTotalCosts = 0;
        let confirmedLogisticsCommissions = 0, pendingLogisticsCommissions = 0;
        let confirmedCustomerCareCommissions = 0, pendingCustomerCareCommissions = 0;
        let confirmedPlatformProfit = 0, pendingPlatformProfit = 0;

        commissionableSales.forEach(sale => {
            const productData = products.find(p => p.id === sale.productId);
            const quantity = sale.quantity || 1;
            const bundle = productData?.bundleOptions?.find(b => b.id === sale.bundleId);
            
            let saleCost = 0, logisticsCommission = 0, customerCareCommission = 0, platformFee = 0;

            if (productData) {
                platformFee = bundle?.platformFee ?? (productData.platformFee || 0);
                customerCareCommission = productData.customerCareCommission || 0;
                logisticsCommission = (productData.fulfillmentCost || 0);
                saleCost = (productData.costOfGoods || 0) * quantity + (productData.shippingCost || 0) + logisticsCommission;
            }
            
            if (sale.status === confirmedStatus) {
                confirmedRevenue += sale.saleAmount;
                confirmedAffiliateCommissions += sale.commissionAmount;
                confirmedTotalCosts += saleCost;
                confirmedLogisticsCommissions += logisticsCommission;
                confirmedCustomerCareCommissions += customerCareCommission;
                if (user.role === UserRole.ADMIN) confirmedPlatformProfit += platformFee;
            } else if (pendingStatuses.includes(sale.status)) {
                pendingRevenue += sale.saleAmount;
                pendingAffiliateCommissions += sale.commissionAmount;
                pendingLogisticsCommissions += logisticsCommission;
                pendingCustomerCareCommissions += customerCareCommission;
                if (user.role === UserRole.ADMIN) pendingPlatformProfit += platformFee;
            }
        });
        
        const netProfit = confirmedRevenue - confirmedAffiliateCommissions - confirmedTotalCosts;
        const deliveredSales = commissionableSales.filter(s => s.status === 'Consegnato').length;
        const approvalRate = commissionableSales.length > 0 ? (deliveredSales / commissionableSales.length) * 100 : 0;

        return {
            totalSalesCount: commissionableSales.length, approvalRate, netProfit,
            confirmedRevenue, pendingRevenue,
            confirmedAffiliateCommissions, pendingAffiliateCommissions,
            confirmedLogisticsCommissions, pendingLogisticsCommissions,
            confirmedCustomerCareCommissions, pendingCustomerCareCommissions,
            confirmedPlatformProfit, pendingPlatformProfit,
            confirmedTotalCosts
        };
    }, [finalFilteredSales, products, isAffiliateView, isLogisticsView, isCustomerCareView, user.role]);

    const performanceChartSales = useMemo(() => {
        if (isLogisticsView) {
            return finalFilteredSales.map(sale => {
                const product = products.find(p => p.id === sale.productId);
                const commission = sale.status === 'Consegnato'
                    ? (product?.fulfillmentCost || 0)
                    : 0;
                return { ...sale, saleAmount: commission };
            });
        }
        if (isCustomerCareView) {
            return finalFilteredSales.map(sale => {
                const product = products.find(p => p.id === sale.productId);
                if (!product) return { ...sale, saleAmount: 0 };
                const commission = product.customerCareCommission || 0;
                return { ...sale, saleAmount: commission };
            });
        }
        if (isAffiliateView) {
            const relevantStatuses: SaleStatus[] = ['Svincolato', 'Consegnato', 'In attesa', 'Confermato', 'Spedito', 'Giacenza'];
            return finalFilteredSales
                .filter(s => relevantStatuses.includes(s.status))
                .map(sale => ({ ...sale, saleAmount: sale.commissionAmount }));
        }
        // For Admin/Manager, filter out statuses that don't contribute to revenue for the chart.
        const excludedStatuses: SaleStatus[] = ['Duplicato', 'Annullato', 'Cancellato'];
        return finalFilteredSales.filter(sale => !excludedStatuses.includes(sale.status));
    }, [finalFilteredSales, products, isLogisticsView, isAffiliateView, isCustomerCareView]);
    
    const chartGranularity = useMemo(() => {
        if (filters.timePeriod === 'today' || filters.timePeriod === 'yesterday') {
            return 'hour';
        }
        if (filters.timePeriod === 'custom' && filters.customStartDate && filters.customEndDate) {
            const startDay = new Date(filters.customStartDate).toISOString().split('T')[0];
            const endDay = new Date(filters.customEndDate).toISOString().split('T')[0];
            if (startDay === endDay) {
                return 'hour';
            }
        }
        return 'day';
    }, [filters.timePeriod, filters.customStartDate, filters.customEndDate]);

    const topAffiliates = useMemo(() => {
        if (isAffiliateView || isLogisticsView || isCustomerCareView) return [];
        
        const nonCommissionableStatuses: SaleStatus[] = ['Annullato', 'Cancellato', 'Duplicato', 'Test'];
        const salesToConsider = finalFilteredSales.filter(sale => !nonCommissionableStatuses.includes(sale.status));
    
        const affiliateSales: Record<string, { name: string; total: number; count: number }> = {};
        for (const sale of salesToConsider) {
            if (!affiliateSales[sale.affiliateId]) {
                affiliateSales[sale.affiliateId] = { name: sale.affiliateName, total: 0, count: 0 };
            }
            affiliateSales[sale.affiliateId].total += sale.saleAmount;
            affiliateSales[sale.affiliateId].count++;
        }
        return Object.values(affiliateSales).sort((a, b) => b.total - a.total).slice(0, 5);
    }, [finalFilteredSales, isAffiliateView, isLogisticsView, isCustomerCareView]);
    
    const performanceProducts = useMemo(() => {
        // LOGISTICS VIEW: Top 5 products by count
        if (isLogisticsView) {
            const productSales: Record<string, { name: string; count: number; totalQuantity: number; imageUrl: string }> = {};
            for (const sale of finalFilteredSales) {
                if (!productSales[sale.productId]) {
                    const product = products.find(p => p.id === sale.productId);
                    productSales[sale.productId] = { name: sale.productName, count: 0, totalQuantity: 0, imageUrl: product?.imageUrl || '' };
                }
                productSales[sale.productId].count++;
                productSales[sale.productId].totalQuantity += sale.quantity || 1;
            }
            return Object.values(productSales).sort((a, b) => b.count - a.count).slice(0, 5);
        }
    
        const nonCommissionableStatuses: SaleStatus[] = ['Annullato', 'Cancellato', 'Duplicato', 'Test'];
        const salesToConsider = finalFilteredSales.filter(sale => !nonCommissionableStatuses.includes(sale.status));
    
        if (isCustomerCareView) {
             const productSales: Record<string, {
                name: string;
                imageUrl: string;
                count: number;
                totalCommission: number;
            }> = {};
        
            for (const sale of salesToConsider) {
                if (!productSales[sale.productId]) {
                    const product = products.find(p => p.id === sale.productId);
                    productSales[sale.productId] = {
                        name: sale.productName,
                        imageUrl: product?.imageUrl || '',
                        count: 0,
                        totalCommission: 0,
                    };
                }
                const productData = products.find(p => p.id === sale.productId);
                if (productData) {
                    const commission = productData.customerCareCommission || 0;
                    productSales[sale.productId].totalCommission += commission;
                }
                productSales[sale.productId].count++;
            }
            return Object.values(productSales).sort((a,b) => b.totalCommission - a.totalCommission);
        }
        
        // ADMIN, MANAGER, AFFILIATE VIEW: All sold products with full stats
        const productSales: Record<string, {
            name: string;
            imageUrl: string;
            count: number;
            totalRevenue: number;
            totalCommission: number;
        }> = {};
    
        for (const sale of salesToConsider) {
            if (!productSales[sale.productId]) {
                const product = products.find(p => p.id === sale.productId);
                productSales[sale.productId] = {
                    name: sale.productName,
                    imageUrl: product?.imageUrl || '',
                    count: 0,
                    totalRevenue: 0,
                    totalCommission: 0,
                };
            }
            productSales[sale.productId].count++;
            productSales[sale.productId].totalRevenue += sale.saleAmount;
            productSales[sale.productId].totalCommission += sale.commissionAmount;
        }
        
        const sorted = Object.values(productSales);
        if (isAffiliateView) {
            sorted.sort((a, b) => b.totalCommission - a.totalCommission);
        } else {
            sorted.sort((a, b) => b.totalRevenue - a.totalRevenue);
        }
        
        return sorted;
    
    }, [finalFilteredSales, products, isAffiliateView, isLogisticsView, isCustomerCareView]);

    const timePeriods: { key: TimePeriod; label: string }[] = [
        { key: 'today', label: 'Oggi' }, { key: 'yesterday', label: 'Ieri' }, { key: 'this_week', label: 'Questa Settimana' },
        { key: 'this_month', label: 'Questo Mese' }, { key: 'last_month', label: 'Mese Scorso' }, { key: 'this_year', label: 'Quest\'Anno' },
        { key: 'last_year', label: 'Anno Scorso' }, { key: 'custom', label: 'Personalizzato' }
    ];
    
    const getPageTitle = () => {
        if (isAffiliateView) return 'Le Tue Performance';
        if (isLogisticsView) return 'Performance Logistica';
        if (isCustomerCareView) return 'Performance Customer Care';
        return 'Performance';
    };

    return (
        <div className="p-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h2 className="text-3xl font-bold text-on-surface">{getPageTitle()}</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 bg-surface text-on-surface font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-wait"
                    >
                        <RefreshIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? 'Aggiornando...' : 'Aggiorna Dati'}
                    </button>
                    <button 
                        onClick={() => setIsFilterVisible(!isFilterVisible)}
                        className="flex items-center gap-2 bg-surface text-on-surface font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-gray-100 transition-colors"
                    >
                        <FilterIcon />
                        {isFilterVisible ? 'Nascondi Filtri' : 'Mostra Filtri'}
                    </button>
                </div>
            </div>

            {isFilterVisible && (
                <div className="bg-surface rounded-xl shadow-md p-4 mb-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        <div>
                            <label htmlFor="timePeriod" className="block text-sm font-medium text-gray-700">Periodo</label>
                            <select id="timePeriod" value={filters.timePeriod} onChange={e => handleFilterChange('timePeriod', e.target.value)} className="w-full mt-1 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary">
                                {timePeriods.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                            </select>
                        </div>
                        {filters.timePeriod === 'custom' && (
                            <>
                                <div>
                                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Da</label>
                                    <input type="date" id="startDate" value={filters.customStartDate} onChange={e => handleFilterChange('customStartDate', e.target.value)} className="w-full mt-1 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"/>
                                </div>
                                <div>
                                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">A</label>
                                    <input type="date" id="endDate" value={filters.customEndDate} onChange={e => handleFilterChange('customEndDate', e.target.value)} className="w-full mt-1 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"/>
                                </div>
                            </>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Prodotto</label>
                             <SearchableSelect
                                options={productOptions}
                                value={filters.selectedProductId}
                                onChange={value => handleFilterChange('selectedProductId', value)}
                                placeholder="Cerca prodotto..."
                            />
                        </div>
                        {!isAffiliateView && !isLogisticsView && (
                            <div>
                                <label htmlFor="affiliateFilter" className="block text-sm font-medium text-gray-700">Affiliato</label>
                                <select id="affiliateFilter" value={filters.selectedAffiliateId} onChange={e => handleFilterChange('selectedAffiliateId', e.target.value)} className="w-full mt-1 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary">
                                    <option value="all">Tutti gli Affiliati</option>
                                    {affiliates.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div>
                            <label htmlFor="subIdQuery" className="block text-sm font-medium text-gray-700">Sub ID</label>
                            <input type="text" id="subIdQuery" value={filters.subIdQuery} onChange={e => handleFilterChange('subIdQuery', e.target.value)} placeholder="Es: facebook" className="w-full mt-1 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"/>
                        </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        {canToggleStatusFilters ? (
                            <div className="flex items-center">
                                <label htmlFor="showStatusFilters" className="block text-sm font-medium text-gray-700 mr-4">Attiva filtro per Stato Ordini</label>
                                <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                    <input type="checkbox" name="showStatusFilters" id="showStatusFilters" checked={showStatusFilters} onChange={() => setShowStatusFilters(!showStatusFilters)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                                    <label htmlFor="showStatusFilters" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                                </div>
                                <style>{`.toggle-checkbox:checked { right: 0; border-color: #4caf50; } .toggle-checkbox:checked + .toggle-label { background-color: #4caf50; }`}</style>
                            </div>
                        ) : (
                            <label className="block text-sm font-medium text-gray-700 mb-2">Stato Ordini (per KPI e grafici)</label>
                        )}

                        {(!canToggleStatusFilters || showStatusFilters) && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {ALL_STATUSES_FOR_FILTER.map(status => (
                                    <button
                                        key={status}
                                        onClick={() => handleStatusToggle(status)}
                                        className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors border ${filters.selectedStatuses.includes(status) ? 'bg-primary text-on-primary border-primary-dark' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                     <div className="mt-4 text-right">
                        <button onClick={resetFilters} className="text-sm font-semibold text-gray-600 hover:text-primary">Resetta Filtri</button>
                    </div>
                </div>
            )}

            <div className="bg-surface p-6 rounded-xl shadow-md mb-8">
                <h3 className="text-xl font-bold text-on-surface mb-4">{isLogisticsView ? 'Andamento Commissioni Logistica' : isAffiliateView || isCustomerCareView ? 'Andamento Commissioni' : 'Andamento Fatturato'}</h3>
                <div className="h-80">
                    <SalesChart sales={performanceChartSales} granularity={chartGranularity} />
                </div>
            </div>
            
            {(isLogisticsView || (canToggleStatusFilters && showStatusFilters)) && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard title="Consegnati" value={statusCounts['Consegnato'] || 0} color="text-green-600" />
                    <StatCard title="Spediti" value={statusCounts['Spedito'] || 0} color="text-blue-600" />
                    <StatCard title="Svincolati" value={statusCounts['Svincolato'] || 0} color="text-teal-600" />
                    <StatCard title="Non Ritirati" value={statusCounts['Non ritirato'] || 0} color="text-orange-600" />
                </div>
            )}


            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {isLogisticsView ? (
                     <>
                        <StatCard 
                            title="Commissioni Logistica"
                            primaryValue={{ label: 'Confermate', value: `€${stats.confirmedLogisticsCommissions?.toFixed(2)}`, color: 'text-green-600' }}
                            secondaryValue={{ label: 'Pending', value: `€${stats.pendingLogisticsCommissions?.toFixed(2)}`, color: 'text-yellow-600' }}
                        />
                        <StatCard title="Ordini Gestiti" value={stats.totalSalesCount} color="text-blue-600" />
                        <StatCard title="Comm. Media per Ordine" value={`€${(stats.totalSalesCount > 0 ? (stats.confirmedLogisticsCommissions || 0) / stats.totalSalesCount : 0).toFixed(2)}`} color="text-purple-600" />
                    </>
                ) : isAffiliateView ? (
                     <>
                        <StatCard title="Commissione Approvata" value={`€${(stats.approvedCommissions || 0).toFixed(2)}`} color="text-green-600" />
                        <StatCard title="Commissione in Pending" value={`€${(stats.pendingCommissions || 0).toFixed(2)}`} color="text-yellow-600" />
                        <StatCard title="Vendite Totali" value={stats.totalSalesCount} color="text-indigo-600" />
                        <StatCard title="Tasso Approvazione" value={`${(stats.approvalRate || 0).toFixed(1)}%`} color="text-purple-600" />
                    </>
                ) : isCustomerCareView ? (
                    <>
                        <StatCard 
                            title="Commissioni Customer Care"
                            primaryValue={{ label: 'Confermate', value: `€${(stats.confirmedCommissions || 0).toFixed(2)}`, color: 'text-green-600' }}
                            secondaryValue={{ label: 'Pending', value: `€${(stats.pendingCommissions || 0).toFixed(2)}`, color: 'text-yellow-600' }}
                        />
                        <StatCard title="Ordini Gestiti" value={stats.totalOrdersHandled} color="text-blue-600" />
                        <StatCard title="Tasso di Conversione" value={`${(stats.conversionRate || 0).toFixed(1)}%`} color="text-purple-600" />
                    </>
                ) : (
                    <>
                        <StatCard
                            title="Fatturato"
                            primaryValue={{ label: 'Confermato', value: `€${stats.confirmedRevenue?.toFixed(2)}`, color: 'text-green-600' }}
                            secondaryValue={{ label: 'Pending', value: `€${stats.pendingRevenue?.toFixed(2)}`, color: 'text-yellow-600' }}
                        />
                        <StatCard
                            title="Profitto Netto (da confermato)"
                            value={`€${(stats.netProfit || 0).toFixed(2)}`}
                            color={(stats.netProfit || 0) >= 0 ? "text-blue-600" : "text-red-600"}
                        />
                         <StatCard
                            title="Commissioni Affiliati"
                            primaryValue={{ label: 'Confermate', value: `€${stats.confirmedAffiliateCommissions?.toFixed(2)}`, color: 'text-green-600' }}
                            secondaryValue={{ label: 'Pending', value: `€${stats.pendingAffiliateCommissions?.toFixed(2)}`, color: 'text-yellow-600' }}
                        />
                         {user.role === UserRole.ADMIN && (
                            <>
                                <StatCard
                                    title="Commissioni Logistica"
                                    primaryValue={{ label: 'Confermate', value: `€${stats.confirmedLogisticsCommissions?.toFixed(2)}`, color: 'text-green-600' }}
                                    secondaryValue={{ label: 'Pending', value: `€${stats.pendingLogisticsCommissions?.toFixed(2)}`, color: 'text-yellow-600' }}
                                />
                                <StatCard
                                    title="Commissioni C. Care"
                                    primaryValue={{ label: 'Confermate', value: `€${stats.confirmedCustomerCareCommissions?.toFixed(2)}`, color: 'text-green-600' }}
                                    secondaryValue={{ label: 'Pending', value: `€${stats.pendingCustomerCareCommissions?.toFixed(2)}`, color: 'text-yellow-600' }}
                                />
                                <StatCard
                                    title="Profitto Piattaforma"
                                    primaryValue={{ label: 'Confermato', value: `€${stats.confirmedPlatformProfit?.toFixed(2)}`, color: 'text-green-600' }}
                                    secondaryValue={{ label: 'Pending', value: `€${stats.pendingPlatformProfit?.toFixed(2)}`, color: 'text-yellow-600' }}
                                />
                            </>
                        )}
                        <StatCard title="Vendite Totali (nel periodo)" value={stats.totalSalesCount} color="text-indigo-600" />
                        <StatCard title="Tasso Approvazione" value={`${(stats.approvalRate || 0).toFixed(1)}%`} color="text-purple-600" />
                        <StatCard title="Costi Totali (da confermato)" value={`€${(stats.confirmedTotalCosts || 0).toFixed(2)}`} color="text-red-600" />
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {!isAffiliateView && !isLogisticsView && !isCustomerCareView && (
                    <div className="bg-surface p-6 rounded-xl shadow-md">
                        <h3 className="text-xl font-bold text-on-surface mb-4">Top Affiliati</h3>
                        <ul className="space-y-4">
                            {topAffiliates.length > 0 ? topAffiliates.map((affiliate, index) => (
                                <li key={index} className="flex items-center gap-4">
                                    <div className="flex-grow">
                                        <p className="font-semibold text-sm">{affiliate.name}</p>
                                        <p className="text-xs text-gray-500">{affiliate.count} vendite</p>
                                    </div>
                                    <p className="font-bold text-green-600 text-sm">€{affiliate.total.toFixed(2)}</p>
                                </li>
                            )) : <p className="text-sm text-gray-500 text-center">Nessun dato per i filtri selezionati.</p>}
                        </ul>
                    </div>
                )}
                <div className={`bg-surface p-6 rounded-xl shadow-md ${(isAffiliateView || isLogisticsView || isCustomerCareView) ? 'lg:col-span-2' : ''}`}>
                    {isLogisticsView ? (
                        <>
                            <h3 className="text-xl font-bold text-on-surface mb-4">Prodotti più Movimentati</h3>
                            <ul className="space-y-4">
                                {(performanceProducts as {name: string, count: number, totalQuantity: number, imageUrl: string}[]).length > 0 ? (performanceProducts as {name: string, count: number, totalQuantity: number, imageUrl: string}[]).map((product, index) => (
                                    <li key={index} className="flex items-center gap-4">
                                        <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded-md object-cover" />
                                        <div className="flex-grow">
                                            <p className="font-semibold text-sm">{product.name}</p>
                                            <p className="text-xs text-gray-500">{product.count} ordini</p>
                                        </div>
                                        <p className="font-bold text-indigo-600 text-sm">{product.totalQuantity} Unità</p>
                                    </li>
                                )) : <p className="text-sm text-gray-500 text-center">Nessun dato per i filtri selezionati.</p>}
                            </ul>
                        </>
                    ) : isCustomerCareView ? (
                        <>
                            <h3 className="text-xl font-bold text-on-surface mb-4">Riepilogo Prodotti Gestiti</h3>
                            <div className="overflow-x-auto max-h-96">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prodotto</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordini Gestiti</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commissioni Totali</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {(performanceProducts as {name: string, imageUrl: string, count: number, totalCommission: number}[]).map((product, index) => (
                                        <tr key={index}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <img className="h-10 w-10 rounded-md object-cover" src={product.imageUrl} alt={product.name} />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{product.count}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">€{product.totalCommission.toFixed(2)}</td>
                                        </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {performanceProducts.length === 0 && <p className="text-sm text-gray-500 text-center py-8">Nessun prodotto gestito per i filtri selezionati.</p>}
                            </div>
                        </>
                    ) : (
                        <>
                            <h3 className="text-xl font-bold text-on-surface mb-4">Riepilogo Prodotti Venduti</h3>
                            <div className="overflow-x-auto max-h-96">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prodotto</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendite</th>
                                            {!isAffiliateView && (
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fatturato</th>
                                            )}
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commissioni</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {(performanceProducts as {name: string, imageUrl: string, count: number, totalRevenue: number, totalCommission: number}[]).map((product, index) => (
                                        <tr key={index}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <img className="h-10 w-10 rounded-md object-cover" src={product.imageUrl} alt={product.name} />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{product.count}</td>
                                            {!isAffiliateView && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">€{product.totalRevenue.toFixed(2)}</td>
                                            )}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">€{product.totalCommission.toFixed(2)}</td>
                                        </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {performanceProducts.length === 0 && <p className="text-sm text-gray-500 text-center py-8">Nessun prodotto venduto per i filtri selezionati.</p>}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Performance;