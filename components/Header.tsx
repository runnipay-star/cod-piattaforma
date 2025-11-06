import React, { useMemo } from 'react';
import { User, UserRole, Sale, Notification, Product, SaleStatus } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ClockIcon } from './icons/ClockIcon';
import NotificationBell from './NotificationBell';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

interface HeaderProps {
  user: User;
  fullUserObject: (User & { currentBalance?: number; }) | null;
  sales: Sale[];
  products: Product[];
  notifications: Notification[];
  onOpenCommissionDetails: () => void;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onViewNotification: (notification: Notification) => void;
  onOpenPlatformCheck: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, fullUserObject, sales, products, notifications, onOpenCommissionDetails, onMarkAsRead, onMarkAllAsRead, onViewNotification, onOpenPlatformCheck }) => {
  const isAffiliate = user.role === UserRole.AFFILIATE;
  const isLogistics = user.role === UserRole.LOGISTICS;
  const isCustomerCare = user.role === UserRole.CUSTOMER_CARE;

  const { approvedRevenue: historicalApproved, pendingRevenue } = useMemo(() => {
    let approved = 0;
    let pending = 0;

    const approvedStatuses: SaleStatus[] = ['Svincolato', 'Consegnato'];
    const pendingStatuses: SaleStatus[] = ['In attesa', 'Contattato', 'Confermato', 'Non raggiungibile', 'Spedito', 'Giacenza'];

    // User-specific calculations
    if (isAffiliate) {
        const userSales = sales.filter(s => s.affiliateId === user.id);
        for (const sale of userSales) {
            if (sale.isBonus || approvedStatuses.includes(sale.status)) {
                approved += sale.commissionAmount;
            } else if (pendingStatuses.includes(sale.status)) {
                pending += sale.commissionAmount;
            }
        }
    } else if (isCustomerCare) {
        const approvedForCC: SaleStatus[] = ['Consegnato'];
        const pendingForCC: SaleStatus[] = ['Contattato', 'Spedito'];
        
        sales.forEach(sale => {
            const product = products.find(p => p.id === sale.productId);
            if (product) {
                const commission = product.customerCareCommission || 0;

                // Platform-wide calculation
                if (approvedForCC.includes(sale.status)) {
                    approved += commission;
                }

                // Platform-wide calculation
                if (pendingForCC.includes(sale.status)) {
                    pending += commission;
                }
            }
        });
    } else if (isLogistics) {
        // Logistics is platform-wide
        const approvedForLogistics: SaleStatus[] = ['Consegnato'];
        const pendingForLogistics: SaleStatus[] = ['Confermato', 'Spedito', 'Svincolato', 'Giacenza', 'Non ritirato'];
         sales.forEach(sale => {
            const product = products.find(p => p.id === sale.productId);
            if (product) {
                const logisticsCommission = (product.fulfillmentCost || 0);
                if (approvedForLogistics.includes(sale.status)) {
                    approved += logisticsCommission;
                } else if (pendingForLogistics.includes(sale.status)) {
                    pending += logisticsCommission;
                }
            }
        });
    } else { // Admin / Manager (platform-wide)
        for (const sale of sales) {
            // Affiliate commissions
            if (sale.isBonus || approvedStatuses.includes(sale.status)) { approved += sale.commissionAmount; }
            else if (pendingStatuses.includes(sale.status)) { pending += sale.commissionAmount; }

            const product = products.find(p => p.id === sale.productId);
            if (product) {
                const quantity = sale.quantity || 1;
                const logisticsCommission = (product.fulfillmentCost || 0) * quantity;
                const customerCareCommission = (product.customerCareCommission || 0);

                // Logistics and CC comms are only approved on 'Consegnato'
                if (sale.status === 'Consegnato') {
                    approved += logisticsCommission + customerCareCommission;
                } else if (pendingStatuses.includes(sale.status)) {
                    pending += logisticsCommission + customerCareCommission;
                }
            }
        }
    }

    return { approvedRevenue: approved, pendingRevenue: pending };
  }, [sales, products, user.id, user.role, isAffiliate, isLogistics, isCustomerCare]);

  const availableBalance = (fullUserObject && typeof fullUserObject.currentBalance === 'number') ? fullUserObject.currentBalance : null;
  
  // For CC, ALWAYS show the platform total, not the balance. For others with a balance (Affiliate), show the balance.
  const finalApprovedValue = isCustomerCare ? historicalApproved : (availableBalance !== null ? availableBalance : historicalApproved);
  const finalApprovedLabel = isCustomerCare ? "Commissioni Approvate" : (availableBalance !== null ? "Saldo Disponibile" : "Commissioni Approvate");
  
  const showPlatformLabel = isCustomerCare || isLogistics || user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
  
  const ApprovedStat = (
      <div className="flex items-center gap-3 text-green-600">
          <CheckCircleIcon className="w-7 h-7" />
          <div>
              <span className="text-xs text-gray-500 font-semibold uppercase">{finalApprovedLabel}{showPlatformLabel && ' (Totale Piattaforma)'}</span>
              <p className="text-xl font-bold">€{finalApprovedValue.toFixed(2)}</p>
          </div>
      </div>
  );
  
  const PendingStat = (
       <div className="flex items-center gap-3 text-orange-500">
          <ClockIcon className="w-7 h-7" />
          <div>
              <span className="text-xs text-gray-500 font-semibold uppercase">Commissioni in Attesa{showPlatformLabel && ' (Totale Piattaforma)'}</span>
              <p className="text-xl font-bold">€{pendingRevenue.toFixed(2)}</p>
          </div>
      </div>
  );

  return (
    <header className="bg-surface shadow-sm p-4 sticky top-0 z-20">
      <div className="flex flex-col sm:flex-row items-center justify-end gap-4 sm:gap-8">
        {isAffiliate || isCustomerCare ? (
            <button onClick={onOpenCommissionDetails} className="text-left rounded-lg p-2 hover:bg-gray-100 transition-colors">
                {ApprovedStat}
            </button>
        ) : (
            ApprovedStat
        )}
        {isAffiliate || isCustomerCare ? (
             <button onClick={onOpenCommissionDetails} className="text-left rounded-lg p-2 hover:bg-gray-100 transition-colors">
                {PendingStat}
            </button>
        ) : (
            PendingStat
        )}
        <button 
            onClick={onOpenPlatformCheck}
            className="flex items-center gap-2 text-left rounded-lg p-2 hover:bg-gray-100 transition-colors text-blue-600"
        >
            <ShieldCheckIcon className="w-7 h-7" />
             <div>
                <span className="text-xs text-gray-500 font-semibold uppercase">Diagnostica</span>
                <p className="text-base font-bold">Check Piattaforma</p>
            </div>
        </button>
        <NotificationBell
            user={user}
            notifications={notifications}
            onMarkAsRead={onMarkAsRead}
            onMarkAllAsRead={onMarkAllAsRead}
            onViewNotification={onViewNotification}
        />
      </div>
    </header>
  );
};

export default Header;