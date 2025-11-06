import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Sale, SaleStatus, User, UserRole, Affiliate } from '../types';
import { WhatsAppIcon } from './icons/WhatsAppIcon';
import { TruckIcon } from './icons/TruckIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { SearchIcon } from './icons/SearchIcon';
import { CogIcon } from './icons/CogIcon';

interface OrderListProps {
  sales: Sale[];
  onViewOrder: (sale: Sale) => void;
  onContactCustomer: (sale: Sale) => void;
  onManageOrder: (sale: Sale) => void;
  user: User;
  affiliates: Affiliate[];
  onOpenWhatsAppTemplateEditor: () => void;
  onRefreshData: () => Promise<void>;
  onShipOrder: (sale: Sale) => void;
  onUpdateSaleStatus: (saleId: string, status: SaleStatus) => Promise<void>;
  onUpdateSale: (sale: Sale) => Promise<void>;
}

const ALL_STATUSES: SaleStatus[] = ['In attesa', 'Contattato', 'Confermato', 'Annullato', 'Cancellato', 'Spedito', 'Svincolato', 'Consegnato', 'Duplicato', 'Non raggiungibile', 'Non ritirato', 'Test', 'Giacenza'];
const LOGISTICS_STATUSES: SaleStatus[] = ['Confermato', 'Spedito', 'Consegnato', 'Svincolato', 'Non ritirato', 'Giacenza'];

type TimePeriod = 'all' | 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';
const FILTERS_STORAGE_KEY = 'orderListFilters';
const COLUMN_WIDTHS_STORAGE_KEY = 'orderColumnWidths';
const GROUPED_COLUMN_WIDTHS_STORAGE_KEY = 'orderGroupedColumnWidths';

const getPeriodRange = (period: TimePeriod, customStart?: string, customEnd?: string): [Date, Date] => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);

    const setTimeToStart = (d: Date) => d.setHours(0, 0, 0, 0);
    const setTimeToEnd = (d: Date) => d.setHours(23, 59, 59, 999);

    switch (period) {
        case 'all':
            return [new Date(0), new Date()];
        case 'today':
            setTimeToStart(start);
            setTimeToEnd(end);
            break;
        case 'yesterday':
            start.setDate(start.getDate() - 1);
            end.setDate(end.getDate() - 1);
            setTimeToStart(start);
            setTimeToEnd(end);
            break;
        case 'this_week':
            const dayOfWeek = now.getDay();
            const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            start = new Date(now.setDate(diff));
            setTimeToStart(start);
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            setTimeToEnd(end);
            break;
        case 'last_week':
            const before7days = new Date();
            before7days.setDate(now.getDate() - 7);
            const dayOfLastWeek = before7days.getDay();
            const diffLastWeek = before7days.getDate() - dayOfLastWeek + (dayOfLastWeek === 0 ? -6 : 1);
            start = new Date(before7days.setDate(diffLastWeek));
            setTimeToStart(start);
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            setTimeToEnd(end);
            break;
        case 'this_month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            setTimeToStart(start);
            setTimeToEnd(end);
            break;
        case 'last_month':
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
            setTimeToStart(start);
            setTimeToEnd(end);
            break;
        case 'custom':
            start = customStart ? new Date(customStart) : new Date(0);
            end = customEnd ? new Date(customEnd) : new Date();
            setTimeToStart(start);
            setTimeToEnd(end);
            break;
    }
    return [start, end];
};

interface GroupedData {
    subId: string;
    sales: Sale[];
    totalCommission: number;
    statusCounts: { [key in SaleStatus]?: number };
}

const ResizableHeader: React.FC<{
    columnKey: string;
    title: string;
    width: number;
    onMouseDown: (e: React.MouseEvent, columnKey: string) => void;
    className?: string;
}> = ({ columnKey, title, width, onMouseDown, className = '' }) => (
    <th
        scope="col"
        style={{ width: `${width}px`, minWidth: `${width}px` }}
        className={`relative px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}
    >
        {title}
        <div
            onMouseDown={(e) => onMouseDown(e, columnKey)}
            className="absolute top-0 right-0 h-full w-5 cursor-col-resize group flex items-center justify-end"
            title={`Ridimensiona ${title}`}
        >
            <div className="w-px h-1/2 bg-gray-300 group-hover:bg-primary transition-colors duration-200"></div>
        </div>
    </th>
);

interface SubIdGroupProps {
    group: GroupedData,
    onViewOrder: (sale: Sale) => void,
    getStatusBadge: (status: SaleStatus) => string,
    formatDate: (dateString: string) => string,
    isCommissionApproved: (sale: Sale) => boolean,
    groupedColumnWidths: Record<string, number>,
    groupedColumnDefaults: Record<string, number>,
    onMouseDown: (e: React.MouseEvent, columnKey: string) => void;
}


const SubIdGroup: React.FC<SubIdGroupProps> = ({ group, onViewOrder, getStatusBadge, formatDate, isCommissionApproved, groupedColumnWidths, groupedColumnDefaults, onMouseDown }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-surface rounded-xl shadow-md overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full text-left p-4 hover:bg-gray-50 focus:outline-none transition-colors duration-150"
            >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                    <div className="col-span-2 md:col-span-1">
                        <p className="text-xs text-gray-500 font-semibold uppercase">Sub ID</p>
                        <p className="font-bold text-primary truncate" title={group.subId}>{group.subId}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase">Ordini</p>
                        <p className="font-semibold text-lg text-gray-800">{group.sales.length}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase">Commissione</p>
                        <p className="font-bold text-lg text-green-600">€{group.totalCommission.toFixed(2)}</p>
                    </div>
                    <div className="col-span-2 md:col-span-1 flex justify-end items-center gap-2">
                        <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                            {Object.entries(group.statusCounts).map(([status, count]) => (
                                <span key={status} className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadge(status as SaleStatus)}`}>
                                    {count}
                                </span>
                            ))}
                        </div>
                        <ChevronDownIcon className={`w-5 h-5 ml-2 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                </div>
            </button>
            {isOpen && (
                <div className="border-t border-gray-200">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <ResizableHeader columnKey="grouped_date" title="Data" width={groupedColumnWidths['grouped_date'] || groupedColumnDefaults['grouped_date']} onMouseDown={onMouseDown} />
                                    <ResizableHeader columnKey="grouped_product" title="Prodotto" width={groupedColumnWidths['grouped_product'] || groupedColumnDefaults['grouped_product']} onMouseDown={onMouseDown} />
                                    <ResizableHeader columnKey="grouped_amount" title="Importo" width={groupedColumnWidths['grouped_amount'] || groupedColumnDefaults['grouped_amount']} onMouseDown={onMouseDown} />
                                    <ResizableHeader columnKey="grouped_commission" title="Commissione" width={groupedColumnWidths['grouped_commission'] || groupedColumnDefaults['grouped_commission']} onMouseDown={onMouseDown} />
                                    <ResizableHeader columnKey="grouped_status" title="Stato" width={groupedColumnWidths['grouped_status'] || groupedColumnDefaults['grouped_status']} onMouseDown={onMouseDown} />
                                    <ResizableHeader columnKey="grouped_orderId" title="ID Ordine" width={groupedColumnWidths['grouped_orderId'] || groupedColumnDefaults['grouped_orderId']} onMouseDown={onMouseDown} />
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {group.sales.map(sale => (
                                    <tr key={sale.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onViewOrder(sale)}>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{formatDate(sale.saleDate)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900" title={sale.productName}>{sale.productName.split(' ')[0]}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-800">€{sale.saleAmount.toFixed(2)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className={`text-sm font-semibold ${isCommissionApproved(sale) ? 'text-green-600' : 'text-yellow-600'}`}>
                                                €{sale.commissionAmount.toFixed(2)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(sale.status)}`}>{sale.status}</span>
                                                {sale.isBonus && <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-800">BONUS</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">{sale.id}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard: React.FC<{ title: string; value: string | number; color: string }> = ({ title, value, color }) => (
    <div className="bg-white p-4 rounded-xl shadow-md flex flex-col">
        <h3 className="text-base font-semibold text-gray-500">{title}</h3>
        <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
);


const OrderList: React.FC<OrderListProps> = ({ sales, onViewOrder, onContactCustomer, onManageOrder, user, affiliates, onOpenWhatsAppTemplateEditor, onRefreshData, onShipOrder, onUpdateSaleStatus, onUpdateSale }) => {
  const isCustomerCare = user.role === UserRole.CUSTOMER_CARE;
  const isLogistics = user.role === UserRole.LOGISTICS;
  const isAffiliate = user.role === UserRole.AFFILIATE;
  const canEditStatus = !isAffiliate;
  const canManageBonus = user.role === UserRole.ADMIN || user.role === UserRole.MANAGER || user.role === UserRole.LOGISTICS || user.role === UserRole.CUSTOMER_CARE;
  const canContact = isCustomerCare || user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
  
  const COLUMN_DEFAULTS: Record<string, number> = {
    date: 170,
    product: 120,
    quantity: 80,
    customerName: 150,
    customerPhone: 130,
    affiliate: 120,
    subId: 100,
    amount: 100,
    commission: 120,
    status: 180,
    bonus: 80,
    orderId: 150,
    actions: 350,
  };

  const GROUPED_COLUMN_DEFAULTS: Record<string, number> = {
    grouped_date: 170,
    grouped_product: 150,
    grouped_amount: 100,
    grouped_commission: 120,
    grouped_status: 150,
    grouped_orderId: 150,
  };

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [groupedColumnWidths, setGroupedColumnWidths] = useState<Record<string, number>>({});
  const resizingColumnRef = useRef<string | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  
  const isCommissionApproved = (sale: Sale) => sale.isBonus || ['Svincolato', 'Consegnato'].includes(sale.status);

  useEffect(() => {
    try {
        const savedWidths = localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY);
        setColumnWidths(savedWidths ? JSON.parse(savedWidths) : COLUMN_DEFAULTS);
        const savedGroupedWidths = localStorage.getItem(GROUPED_COLUMN_WIDTHS_STORAGE_KEY);
        setGroupedColumnWidths(savedGroupedWidths ? JSON.parse(savedGroupedWidths) : GROUPED_COLUMN_DEFAULTS);
    } catch(e) {
        console.error("Failed to parse column widths from localStorage", e);
        setColumnWidths(COLUMN_DEFAULTS);
        setGroupedColumnWidths(GROUPED_COLUMN_DEFAULTS);
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    resizingColumnRef.current = columnKey;
    startXRef.current = e.clientX;
    startWidthRef.current = columnWidths[columnKey] || COLUMN_DEFAULTS[columnKey];
    document.body.style.cursor = 'col-resize';
  }, [columnWidths]);
  
  const handleGroupedMouseDown = useCallback((e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    resizingColumnRef.current = columnKey;
    startXRef.current = e.clientX;
    startWidthRef.current = groupedColumnWidths[columnKey] || GROUPED_COLUMN_DEFAULTS[columnKey];
    document.body.style.cursor = 'col-resize';
  }, [groupedColumnWidths]);


  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingColumnRef.current) return;
    const deltaX = e.clientX - startXRef.current;
    const newWidth = Math.max(startWidthRef.current + deltaX, 80); // min width 80px

    if (resizingColumnRef.current.startsWith('grouped_')) {
        setGroupedColumnWidths(prev => ({ ...prev, [resizingColumnRef.current!]: newWidth }));
    } else {
        setColumnWidths(prev => ({ ...prev, [resizingColumnRef.current!]: newWidth }));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (resizingColumnRef.current) {
        if (resizingColumnRef.current.startsWith('grouped_')) {
            localStorage.setItem(GROUPED_COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(groupedColumnWidths));
        } else {
            localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(columnWidths));
        }
    }
    resizingColumnRef.current = null;
    document.body.style.cursor = 'default';
  }, [columnWidths, groupedColumnWidths]);
  
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);


  const [filters, setFilters] = useState(() => {
    const initialFilters = {
        timePeriod: 'all' as TimePeriod,
        customStartDate: '',
        customEndDate: '',
        statusFilter: 'all' as SaleStatus | 'all',
        searchQuery: '',
        subIdQuery: '',
        showDuplicates: true,
        selectedAffiliateId: 'all',
    };
    try {
        const savedFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
        if (savedFilters) {
            return { ...initialFilters, ...JSON.parse(savedFilters) };
        }
    } catch (e) {
        console.error("Failed to parse filters from localStorage", e);
    }
    return initialFilters;
  });
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [groupBySubId, setGroupBySubId] = useState(false);
  const [showOrderId, setShowOrderId] = useState(true);
  
  useEffect(() => {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  const handleFilterChange = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
      setFilters(prev => ({
          ...prev,
          [key]: value,
          ...(key === 'timePeriod' && value !== 'custom' && { customStartDate: '', customEndDate: '' }),
      }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshData();
    setIsRefreshing(false);
  };

  const getStatusBadge = (status: SaleStatus) => {
    switch (status) {
      // Success states (greens)
      case 'Consegnato': return 'bg-green-100 text-green-800';
      case 'Svincolato': return 'bg-teal-100 text-teal-800';
      
      // In-progress states (blues)
      case 'Spedito': return 'bg-indigo-700 text-white';
      case 'Confermato': return 'bg-blue-100 text-blue-800';
      case 'Contattato': return 'bg-cyan-100 text-cyan-800';
      
      // Attention states (yellows/oranges)
      case 'In attesa': return 'bg-yellow-100 text-yellow-800';
      case 'Non raggiungibile': return 'bg-amber-100 text-amber-800';
      case 'Non ritirato': return 'bg-orange-100 text-orange-800';
      case 'Giacenza': return 'bg-orange-100 text-orange-800';

      // Negative states (reds)
      case 'Cancellato': return 'bg-red-100 text-red-800';
      case 'Annullato': return 'bg-red-100 text-red-800';
      
      // Special/Neutral states
      case 'Duplicato': return 'bg-gray-200 text-gray-700';
      case 'Test': return 'bg-purple-100 text-purple-800';

      default: return 'bg-gray-100 text-gray-800';
    }
  }

  const editableStatuses: SaleStatus[] = ['In attesa', 'Contattato', 'Confermato', 'Annullato', 'Cancellato', 'Spedito', 'Svincolato', 'Consegnato', 'Non raggiungibile', 'Non ritirato', 'Giacenza'];
  const logisticsEditableStatuses: SaleStatus[] = ['Confermato', 'Spedito', 'Consegnato', 'Svincolato', 'Non ritirato', 'Giacenza'];
  const customerCareEditableStatuses: SaleStatus[] = ['In attesa', 'Contattato', 'Confermato', 'Cancellato', 'Non raggiungibile', 'Giacenza'];

  const getOptionsForRole = () => {
    if (isLogistics) return logisticsEditableStatuses;
    if (isCustomerCare) return customerCareEditableStatuses;
    return editableStatuses; // Admin and Manager
  };
  const optionsForRole = getOptionsForRole();

  const handleStatusChange = async (saleId: string, newStatus: SaleStatus) => {
    await onUpdateSaleStatus(saleId, newStatus);
  };

  const handleBonusToggle = (sale: Sale, newBonusState: boolean) => {
    onUpdateSale({ ...sale, isBonus: newBonusState });
  };

  const filteredSales = useMemo(() => {
    const [start, end] = getPeriodRange(filters.timePeriod, filters.customStartDate, filters.customEndDate);

    let result = sales.filter(sale => {
      const saleDate = new Date(sale.saleDate);
      return saleDate >= start && saleDate <= end;
    });

    if (filters.statusFilter !== 'all') {
      result = result.filter(sale => sale.status === filters.statusFilter);
    }
    
    if (!filters.showDuplicates) {
      result = result.filter(sale => sale.status !== 'Duplicato');
    }

    if (filters.searchQuery) {
        const lowerQuery = filters.searchQuery.toLowerCase();
        result = result.filter(sale => 
            sale.customerName?.toLowerCase().includes(lowerQuery) ||
            sale.customerPhone?.includes(lowerQuery)
        );
    }
    
    if (isAffiliate && filters.subIdQuery) {
        const lowerQuery = filters.subIdQuery.toLowerCase();
        result = result.filter(sale => 
            sale.subId?.toLowerCase().includes(lowerQuery)
        );
    }
    
    if (!isAffiliate && !isLogistics && !isCustomerCare && filters.selectedAffiliateId !== 'all') {
        result = result.filter(sale => sale.affiliateId === filters.selectedAffiliateId);
    }
    
    return result.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [sales, filters, isCustomerCare, isAffiliate, isLogistics]);

  const summaryStats = useMemo(() => {
    if (isAffiliate) {
      const approvedStatuses: SaleStatus[] = ['Svincolato', 'Consegnato'];
      const pendingStatuses: SaleStatus[] = ['In attesa', 'Contattato', 'Confermato', 'Non raggiungibile', 'Spedito', 'Giacenza'];

      const approvedCommissions = filteredSales
        .filter(s => s.isBonus || approvedStatuses.includes(s.status))
        .reduce((sum, sale) => sum + sale.commissionAmount, 0);

      const pendingCommissions = filteredSales
        .filter(s => !s.isBonus && pendingStatuses.includes(s.status))
        .reduce((sum, sale) => sum + sale.commissionAmount, 0);

      return {
        approved: approvedCommissions,
        pending: pendingCommissions,
        count: filteredSales.length,
      };
    }

    if (isCustomerCare) {
      const toContactCount = filteredSales.filter(s => s.status === 'In attesa').length;
      return {
        toContact: toContactCount,
        count: filteredSales.length
      };
    }
    
    if (isLogistics) {
       const toShipCount = filteredSales.filter(s => s.status === 'Confermato').length;
       return {
           toShip: toShipCount,
           count: filteredSales.length
       };
    }

    // Admin / Manager view
    const revenue = filteredSales.reduce((sum, sale) => sum + sale.saleAmount, 0);
    const commissions = filteredSales.reduce((sum, sale) => sum + sale.commissionAmount, 0);
    return {
      revenue: revenue,
      commissions: commissions,
      count: filteredSales.length,
    };
  }, [filteredSales, isAffiliate, isCustomerCare, isLogistics]);
  
    const groupedSales = useMemo(() => {
        if (!groupBySubId || !isAffiliate) return null;

        const groups: { [key: string]: { sales: Sale[], totalCommission: number, statusCounts: { [key in SaleStatus]?: number } } } = {};

        for (const sale of filteredSales) {
            const subId = sale.subId || 'Nessun Sub ID';
            if (!groups[subId]) {
                groups[subId] = { sales: [], totalCommission: 0, statusCounts: {} };
            }
            groups[subId].sales.push(sale);
            groups[subId].totalCommission += sale.commissionAmount;
            groups[subId].statusCounts[sale.status] = (groups[subId].statusCounts[sale.status] || 0) + 1;
        }

        return Object.entries(groups)
            .map(([subId, data]) => ({ subId, ...data }))
            .sort((a, b) => b.sales.length - a.sales.length);

    }, [filteredSales, groupBySubId, isAffiliate]);

  const dateFilterOptions: { key: TimePeriod; label: string }[] = [
    { key: 'all', label: 'Tutti' },
    { key: 'today', label: 'Oggi' },
    { key: 'yesterday', label: 'Ieri' },
    { key: 'this_week', label: 'Questa Settimana' },
    { key: 'last_week', label: 'Settimana Scorsa' },
    { key: 'this_month', label: 'Questo Mese' },
    { key: 'last_month', label: 'Mese Scorso' },
    { key: 'custom', label: 'Personalizza' },
  ];

  const statusFilterOptions = isLogistics ? LOGISTICS_STATUSES : ALL_STATUSES;
  
  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-on-surface">Ordini Ricevuti</h2>
        <div className="flex items-center gap-2">
           <button onClick={handleRefresh} disabled={isRefreshing} className="flex items-center gap-2 bg-surface text-on-surface font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-wait">
                <RefreshIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Aggiornando...' : 'Aggiorna Dati'}</span>
            </button>
            {user.role === UserRole.CUSTOMER_CARE && (
              <button onClick={onOpenWhatsAppTemplateEditor} className="bg-secondary text-primary font-bold py-2 px-4 rounded-lg hover:bg-secondary-light transition-colors duration-200 flex items-center gap-2">
                <CogIcon className="w-4 h-4" />
                <span>Modifica Messaggio</span>
              </button>
            )}
        </div>
      </div>
      
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isAffiliate ? (
            <>
                <StatCard title="Commissioni Approvate" value={`€${summaryStats.approved?.toFixed(2)}`} color="text-green-600" />
                <StatCard title="Commissioni in Attesa" value={`€${summaryStats.pending?.toFixed(2)}`} color="text-yellow-600" />
                <StatCard title="Ordini nel Periodo" value={summaryStats.count} color="text-indigo-600" />
            </>
        ) : isCustomerCare ? (
            <>
                <StatCard title="Ordini da Contattare" value={summaryStats.toContact || 0} color="text-yellow-600" />
                <StatCard title="Ordini nel Periodo" value={summaryStats.count} color="text-blue-600" />
            </>
        ) : isLogistics ? (
             <>
                <StatCard title="Ordini da Spedire" value={summaryStats.toShip || 0} color="text-yellow-600" />
                <StatCard title="Ordini nel Periodo" value={summaryStats.count} color="text-blue-600" />
            </>
        ) : ( // Admin & Manager
            <>
                <StatCard title="Fatturato nel Periodo" value={`€${summaryStats.revenue?.toFixed(2)}`} color="text-green-600" />
                <StatCard title="Commissioni da Pagare" value={`€${summaryStats.commissions?.toFixed(2)}`} color="text-yellow-600" />
                <StatCard title="Ordini nel Periodo" value={summaryStats.count} color="text-indigo-600" />
            </>
        )}
      </div>

       <div className="mb-8 bg-surface rounded-xl shadow-md p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center bg-gray-100 p-1 rounded-lg space-x-1 w-full sm:w-auto">
            {(['today', 'this_week', 'this_month', 'all'] as const).map(period => {
              const labels = { today: 'Oggi', this_week: 'Settimana', this_month: 'Mese', all: 'Tutti' };
              return (
                <button
                  key={period}
                  onClick={() => handleFilterChange('timePeriod', period)}
                  className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors w-full sm:w-auto ${
                    filters.timePeriod === period
                      ? 'bg-white text-primary shadow'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {labels[period]}
                </button>
              );
            })}
          </div>
          <button onClick={() => handleFilterChange('timePeriod', 'custom')} className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${filters.timePeriod === 'custom' ? 'bg-primary text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Personalizza
          </button>
        </div>

        {filters.timePeriod === 'custom' && (
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
            <input type="date" value={filters.customStartDate} onChange={e => handleFilterChange('customStartDate', e.target.value)} className="px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"/>
            <span className="text-gray-500">a</span>
            <input type="date" value={filters.customEndDate} onChange={e => handleFilterChange('customEndDate', e.target.value)} className="px-3 py-1.5 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"/>
          </div>
        )}
        
        <div className="pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative">
            <label htmlFor="search-filter" className="block text-xs font-medium text-gray-500 mb-1">Cerca Cliente</label>
            <input
              type="text"
              id="search-filter"
              placeholder="Nome o telefono..."
              value={filters.searchQuery}
              onChange={e => handleFilterChange('searchQuery', e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm py-2 pl-3 pr-10"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none top-5">
              <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <div>
            <label htmlFor="status-filter" className="block text-xs font-medium text-gray-500 mb-1">Stato</label>
            <select
              id="status-filter"
              value={filters.statusFilter}
              onChange={e => handleFilterChange('statusFilter', e.target.value as any)}
              className="w-full bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm py-2 pl-3 pr-8"
            >
              <option value="all">Tutti gli Stati</option>
              {statusFilterOptions.map(status => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
           {(!isAffiliate && !isLogistics && !isCustomerCare) && (
             <div>
                <label htmlFor="affiliate-filter" className="block text-xs font-medium text-gray-500 mb-1">Affiliato</label>
                <select
                  id="affiliate-filter"
                  value={filters.selectedAffiliateId}
                  onChange={e => handleFilterChange('selectedAffiliateId', e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm py-2 pl-3 pr-8"
                >
                  <option value="all">Tutti gli Affiliati</option>
                  {affiliates.map(aff => <option key={aff.id} value={aff.id}>{aff.name}</option>)}
                </select>
              </div>
           )}
          {isAffiliate && (
            <div className="relative">
              <label htmlFor="subid-filter" className="block text-xs font-medium text-gray-500 mb-1">Sub ID</label>
              <input
                type="text"
                id="subid-filter"
                placeholder="Es: facebook"
                value={filters.subIdQuery}
                onChange={e => handleFilterChange('subIdQuery', e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm py-2 pl-3"
              />
            </div>
          )}
        </div>
        
        <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                  <input type="checkbox" id="show-duplicates" checked={filters.showDuplicates} onChange={e => handleFilterChange('showDuplicates', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                  <label htmlFor="show-duplicates" className="text-sm text-gray-700">Mostra Duplicati</label>
              </div>
               <div className="flex items-center gap-2">
                  <input type="checkbox" id="show-order-id" checked={showOrderId} onChange={e => setShowOrderId(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                  <label htmlFor="show-order-id" className="text-sm text-gray-700">Mostra ID Ordine</label>
              </div>
            </div>
            {isAffiliate && (
                <div className="flex items-center gap-2">
                    <input type="checkbox" id="group-by-subid" checked={groupBySubId} onChange={e => setGroupBySubId(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                    <label htmlFor="group-by-subid" className="text-sm font-semibold text-gray-700">Raggruppa per Sub ID</label>
                </div>
            )}
        </div>
      </div>


      {isAffiliate && groupBySubId && groupedSales ? (
         <div className="space-y-3">
            {groupedSales.map((group) => (
                <SubIdGroup 
                    key={group.subId} 
                    group={group} 
                    onViewOrder={onViewOrder}
                    getStatusBadge={getStatusBadge}
                    formatDate={formatDate}
                    isCommissionApproved={isCommissionApproved}
                    groupedColumnWidths={groupedColumnWidths}
                    groupedColumnDefaults={GROUPED_COLUMN_DEFAULTS}
                    onMouseDown={handleGroupedMouseDown}
                />
            ))}
            {groupedSales.length === 0 && (<p className="text-center text-gray-500 py-12">Nessun ordine trovato con i filtri attuali.</p>)}
        </div>
      ) : (
          <div className="bg-surface rounded-xl shadow-md overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <ResizableHeader columnKey="date" title="Data Ordine" width={columnWidths['date'] || COLUMN_DEFAULTS['date']} onMouseDown={handleMouseDown} />
                  <ResizableHeader columnKey="product" title="Prodotto" width={columnWidths['product'] || COLUMN_DEFAULTS['product']} onMouseDown={handleMouseDown} />
                  <ResizableHeader columnKey="quantity" title="Quantità" className="text-center" width={columnWidths['quantity'] || COLUMN_DEFAULTS['quantity']} onMouseDown={handleMouseDown} />
                  {isCustomerCare && (
                    <>
                      <ResizableHeader columnKey="customerName" title="Nome e Cognome" width={columnWidths['customerName'] || COLUMN_DEFAULTS['customerName']} onMouseDown={handleMouseDown} />
                      <ResizableHeader columnKey="customerPhone" title="Numero di Telefono" width={columnWidths['customerPhone'] || COLUMN_DEFAULTS['customerPhone']} onMouseDown={handleMouseDown} />
                    </>
                  )}
                  {!isAffiliate && <ResizableHeader columnKey="affiliate" title="Affiliato" width={columnWidths['affiliate'] || COLUMN_DEFAULTS['affiliate']} onMouseDown={handleMouseDown} />}
                  {isAffiliate && <ResizableHeader columnKey="subId" title="Sub ID" width={columnWidths['subId'] || COLUMN_DEFAULTS['subId']} onMouseDown={handleMouseDown} />}
                  <ResizableHeader columnKey="amount" title="Importo" width={columnWidths['amount'] || COLUMN_DEFAULTS['amount']} onMouseDown={handleMouseDown} />
                  {!isCustomerCare && !isLogistics && (
                    <ResizableHeader columnKey="commission" title="Commissione" width={columnWidths['commission'] || COLUMN_DEFAULTS['commission']} onMouseDown={handleMouseDown} />
                  )}
                  <ResizableHeader columnKey="status" title="Stato" width={columnWidths['status'] || COLUMN_DEFAULTS['status']} onMouseDown={handleMouseDown} />
                  {canManageBonus && <ResizableHeader columnKey="bonus" title="Bonus" width={columnWidths['bonus'] || COLUMN_DEFAULTS['bonus']} onMouseDown={handleMouseDown} />}
                  {showOrderId && <ResizableHeader columnKey="orderId" title="ID Ordine" width={columnWidths['orderId'] || COLUMN_DEFAULTS['orderId']} onMouseDown={handleMouseDown} />}
                  <ResizableHeader columnKey="actions" title="Azioni" width={columnWidths['actions'] || COLUMN_DEFAULTS['actions']} onMouseDown={handleMouseDown} />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSales.map((sale) => {
                  const variantDisplay = sale.selectedVariants && sale.selectedVariants.length > 0 
                    ? sale.selectedVariants.map(v => v.variantName).join(', ') 
                    : sale.variantName;
                  return (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap" onClick={() => onViewOrder(sale)}><div className="text-sm text-gray-900">{formatDate(sale.saleDate)}</div></td>
                    <td className="px-6 py-4" onClick={() => onViewOrder(sale)}>
                        <div className="text-sm font-medium text-gray-900 truncate" title={sale.productName}>
                            {sale.productName}
                        </div>
                        {variantDisplay && <div className="text-xs text-gray-500 truncate" title={variantDisplay}>{variantDisplay}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={() => onViewOrder(sale)}><div className="text-sm font-bold text-center text-gray-900">{sale.quantity || 1}</div></td>
                    {isCustomerCare && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap" onClick={() => onViewOrder(sale)}><div className="text-sm text-gray-900 truncate" title={sale.customerName}>{sale.customerName || '-'}</div></td>
                        <td className="px-6 py-4 whitespace-nowrap" onClick={() => onViewOrder(sale)}><div className="text-sm text-gray-500">{sale.customerPhone || '-'}</div></td>
                      </>
                    )}
                    {!isAffiliate && (
                        <td className="px-6 py-4 whitespace-nowrap" onClick={() => onViewOrder(sale)}>
                            <div className="text-sm text-gray-500 truncate" title={sale.affiliateName}>
                                {sale.affiliateName}
                            </div>
                        </td>
                    )}
                    {isAffiliate && (<td className="px-6 py-4 whitespace-nowrap" onClick={() => onViewOrder(sale)}><div className="text-sm text-gray-500 font-mono">{sale.subId || '-'}</div></td>)}
                    <td className="px-6 py-4 whitespace-nowrap" onClick={() => onViewOrder(sale)}><div className="text-sm font-semibold text-gray-900">€{sale.saleAmount.toFixed(2)}</div></td>
                    {!isCustomerCare && !isLogistics && (
                        <td className="px-6 py-4 whitespace-nowrap" onClick={() => onViewOrder(sale)}>
                            <div className={`text-sm font-semibold ${isCommissionApproved(sale) ? 'text-green-600' : 'text-yellow-600'}`}>
                                €{sale.commissionAmount.toFixed(2)}
                            </div>
                        </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap" onClick={() => onViewOrder(sale)}>
                        {canEditStatus ? (
                            <div className="flex items-center gap-2">
                              <select
                                  value={sale.status}
                                  onChange={(e) => handleStatusChange(sale.id, e.target.value as SaleStatus)}
                                  onClick={(e) => e.stopPropagation()}
                                  disabled={sale.status === 'Duplicato' || sale.status === 'Test'}
                                  className={`w-full text-xs font-semibold rounded-full border-0 focus:ring-2 focus:ring-offset-2 focus:ring-primary py-1 pl-2 pr-7 ${getStatusBadge(sale.status)} disabled:opacity-70 disabled:cursor-not-allowed`}
                              >
                                  {!optionsForRole.includes(sale.status) && <option value={sale.status} disabled>{sale.status}</option>}
                                  {optionsForRole.map(status => <option key={status} value={status}>{status}</option>)}
                              </select>
                               {sale.isBonus && <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-800">BONUS</span>}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(sale.status)}`}>{sale.status}</span>
                                {sale.isBonus && <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-800">BONUS</span>}
                            </div>
                        )}
                    </td>
                    {canManageBonus && (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                            <input 
                                type="checkbox" 
                                id={`bonus-${sale.id}`} 
                                checked={!!sale.isBonus} 
                                onChange={() => handleBonusToggle(sale, !sale.isBonus)} 
                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                            />
                            <label htmlFor={`bonus-${sale.id}`} className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                        </div>
                      </td>
                    )}
                    {showOrderId && <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-500" onClick={() => onViewOrder(sale)}>{sale.id}</td>}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                         {(isLogistics || user.role === UserRole.ADMIN) && sale.status === 'Confermato' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); onShipOrder(sale); }} 
                            className="flex items-center gap-1.5 bg-green-600 text-white font-bold text-xs py-2 px-3 rounded-lg hover:bg-green-700 transition-colors" 
                            title="Crea Spedizione con PaccoFacile"
                          >
                            <PaperAirplaneIcon className="w-4 h-4" />
                            <span>Crea Spedizione</span>
                          </button>
                        )}
                        {(isLogistics || (user.role === UserRole.ADMIN && sale.status === 'Confermato')) && (
                           <button 
                            onClick={(e) => { e.stopPropagation(); onManageOrder(sale); }} 
                            className="flex items-center gap-1.5 bg-gray-500 text-white font-bold text-xs py-2 px-3 rounded-lg hover:bg-gray-600 transition-colors"
                            title="Gestisci stato e tracking"
                          >
                            <TruckIcon className="w-4 h-4" />
                            <span>Logistica</span>
                          </button>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); onViewOrder(sale); }} 
                          className="flex items-center gap-1.5 bg-blue-600 text-white font-bold text-xs py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors"
                          title="Vedi e modifica i dettagli dell'ordine"
                        >
                          <CogIcon className="w-4 h-4" />
                          <span>Gestisci</span>
                        </button>
                        {canContact && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); onContactCustomer(sale); }} 
                            className="flex items-center gap-1.5 bg-green-600 text-white font-bold text-xs py-2 px-3 rounded-lg hover:bg-green-700 transition-colors"
                            title="Contatta Cliente via WhatsApp"
                          >
                            <WhatsAppIcon className="w-4 h-4" />
                            <span>Contatta</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
             {filteredSales.length === 0 && (
                <p className="text-center text-gray-500 py-12">Nessun ordine trovato con i filtri attuali.</p>
            )}
          </div>
      )}
      <style>{`
          .toggle-checkbox:checked { right: 0; border-color: #4caf50; }
          .toggle-checkbox:checked + .toggle-label { background-color: #4caf50; }
      `}</style>
    </div>
  );
};

export default OrderList;