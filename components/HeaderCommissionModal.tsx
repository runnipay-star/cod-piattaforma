import React, { useMemo } from 'react';
import { Sale, SaleStatus } from '../types';
import { TruckIcon } from './icons/TruckIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ClockIcon } from './icons/ClockIcon';
import { XCircleIcon } from './icons/XCircleIcon';

interface HeaderCommissionModalProps {
  sales: Sale[];
}

const StatRow: React.FC<{ icon: React.ReactNode; label: string; count: number; value: number }> = ({ icon, label, count, value }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
    <div className="flex items-center gap-3">
      <div className="text-primary">{icon}</div>
      <div>
        <p className="font-semibold text-gray-800">{label}</p>
        <p className="text-sm text-gray-500">{count} {count === 1 ? 'ordine' : 'ordini'}</p>
      </div>
    </div>
    <p className="font-bold text-lg text-green-600">€{value.toFixed(2)}</p>
  </div>
);

const HeaderCommissionModal: React.FC<HeaderCommissionModalProps> = ({ sales }) => {
  const statusBreakdown = useMemo(() => {
    const breakdown: Record<string, { count: number; totalCommission: number }> = {
      'Spedito': { count: 0, totalCommission: 0 },
      'Consegnato': { count: 0, totalCommission: 0 },
      'Svincolato': { count: 0, totalCommission: 0 },
      'Non ritirato': { count: 0, totalCommission: 0 },
      'Giacenza': { count: 0, totalCommission: 0 },
    };

    for (const sale of sales) {
      if (sale.status in breakdown) {
        breakdown[sale.status].count++;
        breakdown[sale.status].totalCommission += sale.commissionAmount;
      }
    }

    return breakdown;
  }, [sales]);

  return (
    <div className="space-y-4">
      <StatRow
        icon={<TruckIcon className="w-6 h-6" />}
        label="Spedito"
        count={statusBreakdown['Spedito'].count}
        value={statusBreakdown['Spedito'].totalCommission}
      />
      <StatRow
        icon={<CheckCircleIcon className="w-6 h-6" />}
        label="Consegnato"
        count={statusBreakdown['Consegnato'].count}
        value={statusBreakdown['Consegnato'].totalCommission}
      />
      <StatRow
        icon={<CheckCircleIcon className="w-6 h-6" />}
        label="Svincolato"
        count={statusBreakdown['Svincolato'].count}
        value={statusBreakdown['Svincolato'].totalCommission}
      />
       <StatRow
        icon={<ClockIcon className="w-6 h-6" />}
        label="Giacenza"
        count={statusBreakdown['Giacenza'].count}
        value={statusBreakdown['Giacenza'].totalCommission}
      />
      <StatRow
        icon={<XCircleIcon className="w-6 h-6" />}
        label="Non Ritirato"
        count={statusBreakdown['Non ritirato'].count}
        value={statusBreakdown['Non ritirato'].totalCommission}
      />
    </div>
  );
};

export default HeaderCommissionModal;