import React, { useMemo } from 'react';
import { User, UserRole, Sale, Notification, Product, SaleStatus } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ClockIcon } from './icons/ClockIcon';
import NotificationBell from './NotificationBell';

interface HeaderProps {
  user: User;
  sales: Sale[];
  products: Product[];
  notifications: Notification[];
  onOpenCommissionDetails: () => void;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onViewNotification: (notification: Notification) => void;
}

const Header: React.FC<HeaderProps> = ({ user, sales, products, notifications, onOpenCommissionDetails, onMarkAsRead, onMarkAllAsRead, onViewNotification }) => {
  const isAffiliate = user.role === UserRole.AFFILIATE;
  const isLogistics = user.role === UserRole.LOGISTICS;
  const isCustomerCare = user.role === UserRole.CUSTOMER_CARE;

  const { approvedRevenue, pendingRevenue } = useMemo(() => {
    let approved = 0;
    let pending = 0;

    const approvedForAffiliate: SaleStatus[] = ['Svincolato', 'Consegnato'];
    const pendingForAffiliate: SaleStatus[] = ['In attesa', 'Confermato', 'Spedito', 'Giacenza'];

    const approvedForLogistics: SaleStatus[] = ['Consegnato'];
    const pendingForLogistics: SaleStatus[] = ['Confermato', 'Spedito', 'Svincolato', 'Giacenza', 'Non ritirato'];
    
    const approvedForCustomerCare: SaleStatus[] = ['Consegnato'];
    const pendingForCustomerCare: SaleStatus[] = ['In attesa', 'Contattato', 'Confermato', 'Spedito', 'Giacenza'];


    for (const sale of sales) {
        let commission = 0;

        if (isLogistics) {
            const product = products.find(p => p.id === sale.productId);
            if (product) {
                const logisticsCommission = (product.fulfillmentCost || 0);
                if (approvedForLogistics.includes(sale.status)) {
                    approved += logisticsCommission;
                } else if (pendingForLogistics.includes(sale.status)) {
                    pending += logisticsCommission;
                }
            }
        } else if (isCustomerCare) {
            const product = products.find(p => p.id === sale.productId);
            if (product) {
                const careCommission = product.customerCareCommission || 0;
                 if (approvedForCustomerCare.includes(sale.status)) {
                    approved += careCommission;
                } else if (pendingForCustomerCare.includes(sale.status)) {
                    pending += careCommission;
                }
            }
        } else { // Affiliate, Manager, Admin
            commission = sale.commissionAmount;
            if (approvedForAffiliate.includes(sale.status)) {
                approved += commission;
            } else if (pendingForAffiliate.includes(sale.status)) {
                pending += commission;
            }
        }
    }

    return { approvedRevenue: approved, pendingRevenue: pending };
}, [sales, products, user.role, isLogistics, isCustomerCare]);
  
  const ApprovedStat = (
      <div className="flex items-center gap-3 text-green-600">
          <CheckCircleIcon className="w-7 h-7" />
          <div>
              <span className="text-xs text-gray-500 font-semibold uppercase">Commissioni Approvate</span>
              <p className="text-xl font-bold">€{approvedRevenue.toFixed(2)}</p>
          </div>
      </div>
  );
  
  const PendingStat = (
       <div className="flex items-center gap-3 text-orange-500">
          <ClockIcon className="w-7 h-7" />
          <div>
              <span className="text-xs text-gray-500 font-semibold uppercase">Commissioni in Attesa</span>
              <p className="text-xl font-bold">€{pendingRevenue.toFixed(2)}</p>
          </div>
      </div>
  );

  return (
    <header className="bg-surface shadow-sm p-4 sticky top-0 z-20">
      <div className="flex flex-col sm:flex-row items-center justify-end gap-4 sm:gap-8">
        {isAffiliate ? (
            <button onClick={onOpenCommissionDetails} className="text-left rounded-lg p-2 hover:bg-gray-100 transition-colors">
                {ApprovedStat}
            </button>
        ) : (
            ApprovedStat
        )}
        {isAffiliate ? (
             <button onClick={onOpenCommissionDetails} className="text-left rounded-lg p-2 hover:bg-gray-100 transition-colors">
                {PendingStat}
            </button>
        ) : (
            PendingStat
        )}
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