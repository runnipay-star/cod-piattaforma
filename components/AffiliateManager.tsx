
import React from 'react';
import { Affiliate } from '../types';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';

interface AffiliateManagerProps {
  affiliates: Affiliate[];
  onAddAffiliate: () => void;
  onEditAffiliate: (affiliate: Affiliate) => void;
  onDeleteAffiliate: (affiliateId: string) => void;
}

const AffiliateManager: React.FC<AffiliateManagerProps> = ({ affiliates, onAddAffiliate, onEditAffiliate, onDeleteAffiliate }) => {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-on-surface">Gestione Affiliati</h2>
        <button
          onClick={onAddAffiliate}
          className="bg-primary text-on-primary font-bold py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors duration-200 flex items-center gap-2"
        >
          <PlusIcon />
          Aggiungi Affiliato
        </button>
      </div>
      <div className="bg-surface rounded-xl shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stato</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendite Totali</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commissioni Totali</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Azioni</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {affiliates.map((affiliate) => (
              <tr key={affiliate.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{affiliate.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{affiliate.email}</div>
                </td>
                 <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${!affiliate.isBlocked ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {!affiliate.isBlocked ? 'Attivo' : 'Bloccato'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">€{affiliate.totalSales.toFixed(2)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-green-600 font-semibold">€{affiliate.totalCommissions.toFixed(2)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-4">
                    <button onClick={() => onEditAffiliate(affiliate)} className="text-primary hover:text-primary-dark">
                      <PencilIcon />
                    </button>
                    <button onClick={() => onDeleteAffiliate(affiliate.id)} className="text-red-600 hover:text-red-800">
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AffiliateManager;