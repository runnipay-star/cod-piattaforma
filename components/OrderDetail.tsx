import React, { useState } from 'react';
import { Sale, SaleStatus, User, UserRole, Product } from '../types';
import { WhatsAppIcon } from './icons/WhatsAppIcon';

interface OrderDetailProps {
  sale: Sale;
  user: User;
  products: Product[];
  onSave: (sale: Sale) => void;
}

const ALL_STATUSES: SaleStatus[] = ['In attesa', 'Contattato', 'Confermato', 'Annullato', 'Cancellato', 'Spedito', 'Svincolato', 'Consegnato', 'Non raggiungibile', 'Non ritirato', 'Giacenza'];

const DetailRow: React.FC<{ label: string; value: React.ReactNode; className?: string }> = ({ label, value, className = '' }) => (
  <div className={`py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-t border-gray-200 ${className}`}>
    <dt className="text-sm font-medium text-gray-500">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{value || '-'}</dd>
  </div>
);

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
    <h3 className="text-lg leading-6 font-bold text-primary mb-2 mt-4">{title}</h3>
);

const getStatusBadge = (status: SaleStatus) => {
    const colorClass = {
        'Consegnato': 'bg-green-100 text-green-800',
        'Svincolato': 'bg-teal-100 text-teal-800',
        'Spedito': 'bg-indigo-700 text-white',
        'Confermato': 'bg-blue-100 text-blue-800',
        'Contattato': 'bg-cyan-100 text-cyan-800',
        'In attesa': 'bg-yellow-100 text-yellow-800',
        'Non raggiungibile': 'bg-amber-100 text-amber-800',
        'Non ritirato': 'bg-orange-100 text-orange-800',
        'Giacenza': 'bg-orange-100 text-orange-800',
        'Cancellato': 'bg-red-100 text-red-800',
        'Annullato': 'bg-red-100 text-red-800',
        'Duplicato': 'bg-gray-200 text-gray-700',
        'Test': 'bg-purple-100 text-purple-800',
    }[status] || 'bg-gray-100 text-gray-800';
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>{status}</span>;
}

const OrderDetail: React.FC<OrderDetailProps> = ({ sale, user, products, onSave }) => {
  const [currentStatus, setCurrentStatus] = useState<SaleStatus>(sale.status);
  const [trackingCode, setTrackingCode] = useState<string>(sale.trackingCode || '');
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState('customer');

  const isEditable = user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
  const isAdmin = user.role === UserRole.ADMIN;
  const isLogistics = user.role === UserRole.LOGISTICS;
  const isCustomerCare = user.role === UserRole.CUSTOMER_CARE;
  const product = products.find(p => p.id === sale.productId);

  const getWhatsAppLink = (phone: string | undefined): string => {
    if (!phone) return '';
    let cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length === 10 && cleanedPhone.startsWith('3')) {
        cleanedPhone = `39${cleanedPhone}`;
    }
    return `https://wa.me/${cleanedPhone}`;
  }

  const handleSave = () => {
    if (currentStatus === 'Spedito' && !trackingCode.trim()) {
      setError('Il codice di tracciamento è obbligatorio per lo stato "Spedito".');
      return;
    }
    setError('');
    onSave({ 
        ...sale, 
        status: currentStatus, 
        trackingCode: trackingCode.trim() ? trackingCode.trim() : undefined,
        statusUpdatedAt: new Date().toISOString(),
        lastContactedBy: user.id,
        lastContactedByName: user.name
    });
  };

  const hasChanges = currentStatus !== sale.status || trackingCode !== (sale.trackingCode || '');

  const tabs = [
    { id: 'customer', label: 'Cliente & Note' },
    { id: 'summary', label: 'Riepilogo Ordine' },
    { id: 'product', label: 'Dettagli Prodotto' },
    { id: 'affiliate', label: 'Dettagli Affiliato' },
    { id: 'tracking', label: 'Tracking' },
  ];

  const renderContent = () => {
    switch (activeTab) {
        case 'customer':
            const fullAddress = [
                sale.customer_street_address,
                sale.customer_house_number,
                sale.customer_city,
                sale.customer_province,
                sale.customer_zip
            ].filter(Boolean).join(', ');

            return (
                <>
                    <SectionTitle title="Dettagli Cliente" />
                    <DetailRow label="Email Cliente" value={sale.customerEmail} className="border-t-0" />
                    <DetailRow label="Nome Cliente" value={sale.customerName} />
                    <DetailRow label="Indirizzo Cliente" value={fullAddress} />
                    <DetailRow 
                    label="Telefono Cliente" 
                    value={
                        sale.customerPhone ? (
                        <div className="flex items-center gap-2">
                            <span>{sale.customerPhone}</span>
                            <a
                            href={getWhatsAppLink(sale.customerPhone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-100 transition-colors"
                            aria-label="Contatta su WhatsApp"
                            >
                            <WhatsAppIcon className="w-5 h-5" />
                            </a>
                        </div>
                        ) : ('-')
                    } 
                    />
                    {(sale.notes || sale.lastContactedByName) && (
                        <div className="pt-6 mt-6 border-t border-gray-200">
                            <SectionTitle title="Note e Cronologia Contatto" />
                            <DetailRow
                                label="Note"
                                value={<p className="whitespace-pre-wrap">{sale.notes || '-'}</p>}
                                className="border-t-0"
                            />
                            <DetailRow label="Ultimo Aggiornamento Stato" value={sale.lastContactedByName && sale.statusUpdatedAt ? `Da ${sale.lastContactedByName} il ${new Date(sale.statusUpdatedAt).toLocaleString('it-IT')}` : '-'} />
                        </div>
                    )}
                </>
            );
        case 'summary':
            return (
                <>
                    <SectionTitle title="Riepilogo Ordine" />
                    <DetailRow label="ID Ordine" value={<span className="font-mono">{sale.id}</span>} className="border-t-0" />
                    <DetailRow label="Data Ordine" value={new Date(sale.saleDate).toLocaleString('it-IT')} />
                    <DetailRow label="Stato" value={
                        isEditable && !['Duplicato', 'Test'].includes(sale.status) ? (
                            <select value={currentStatus} onChange={(e) => setCurrentStatus(e.target.value as SaleStatus)} className="block w-full max-w-xs px-3 py-1 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                                {ALL_STATUSES.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        ) : getStatusBadge(sale.status)
                    } />
                    {isEditable && currentStatus === 'Spedito' && (
                        <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-t border-gray-200">
                            <dt className="text-sm font-medium text-gray-500">Codice di Tracciamento <span className="text-red-500">*</span></dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                <input type="text" value={trackingCode} onChange={(e) => { setTrackingCode(e.target.value); if (e.target.value.trim()) setError(''); }} required className="block w-full px-3 py-1 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" placeholder="Es. T123456789IT" />
                            </dd>
                        </div>
                    )}
                    {isAdmin && product ? (
                        (() => {
                            const bundle = product.bundleOptions?.find(b => b.id === sale.bundleId);
                            const quantity = sale.quantity || 1;
                            const affiliateCommission = sale.commissionAmount;
                            const logisticsCommission = (product.fulfillmentCost || 0);
                            const shippingCost = (product.shippingCost || 0);
                            const customerCareCommission = product.customerCareCommission || 0;
                            const platformFee = bundle?.platformFee ?? (product.platformFee || 0);
                            const costOfGoods = (product.costOfGoods || 0) * quantity;
                            const directCosts = affiliateCommission + logisticsCommission + costOfGoods + shippingCost;
                            const netProfit = sale.saleAmount - directCosts;
                            const isShippingPaid = !(product.freeShipping ?? true);

                            return (
                                <>
                                    <DetailRow label="Importo Totale" value={<span className="font-bold text-lg">€{sale.saleAmount.toFixed(2)}</span>} />
                                    <div className="pl-4 border-l-2 border-gray-200">
                                        <DetailRow label={`Costo Prodotto (x${quantity})`} value={<span className="font-semibold text-red-600">- €{costOfGoods.toFixed(2)}</span>} />
                                        <DetailRow label="Costo Spedizione" value={<><span className="font-semibold text-red-600">- €{shippingCost.toFixed(2)}</span>{isShippingPaid && <span className="text-xs text-gray-500 ml-2">(Incasso spedizione di €{(product.shippingCharge || 0).toFixed(2)} incluso nel totale)</span>}</>} />
                                        <DetailRow label="Comm. Affiliato" value={<span className="font-semibold text-red-600">- €{affiliateCommission.toFixed(2)}</span>} />
                                        <DetailRow label="Comm. Logistica" value={<span className="font-semibold text-red-600">- €{logisticsCommission.toFixed(2)}</span>} />
                                    </div>
                                    <DetailRow label="Profitto Netto" value={<span className={`font-bold text-lg ${netProfit >= 0 ? 'text-blue-600' : 'text-red-700'}`}>€{netProfit.toFixed(2)}</span>} />
                                    <div className="mt-2 pl-4 border-l-2 border-dashed border-gray-300">
                                        <dt className="text-xs font-medium text-gray-400">Altri Costi (esclusi dal profitto netto)</dt>
                                        <DetailRow label="Comm. C. Care" value={<span className="font-semibold text-gray-500">- €{customerCareCommission.toFixed(2)}</span>} />
                                        <DetailRow label="Fee Piattaforma" value={<span className="font-semibold text-gray-500">- €{platformFee.toFixed(2)}</span>} />
                                    </div>
                                </>
                            );
                        })()
                    ) : (
                        <>
                            {!isLogistics && !isCustomerCare && (
                                <>
                                    <DetailRow label="Importo Totale" value={<span className="font-bold">€{sale.saleAmount.toFixed(2)}</span>} />
                                    <DetailRow label="Commissione Affiliato" value={<span className="font-bold text-green-600">€{sale.commissionAmount.toFixed(2)}</span>} />
                                </>
                            )}
                            {isLogistics && product && (<DetailRow label={`Commissione Logistica ${sale.status === 'Consegnato' ? '(Maturata)' : '(Potenziale)'}`} value={<span className={`font-bold ${sale.status === 'Consegnato' ? 'text-indigo-600' : 'text-gray-500'}`}>€{(product.fulfillmentCost || 0).toFixed(2)}</span>} />)}
                            {isCustomerCare && product && (() => { const customerCareCommission = product?.customerCareCommission || 0; return (<DetailRow label={`Commissione Customer Care ${sale.status === 'Consegnato' ? '(Maturata)' : '(Potenziale)'}`} value={<span className={`font-bold ${sale.status === 'Consegnato' ? 'text-indigo-600' : 'text-gray-500'}`}>€{customerCareCommission.toFixed(2)}</span>} />);})()}
                        </>
                    )}
                </>
            );
        case 'product':
            return (
                <>
                    <SectionTitle title="Dettagli Prodotto" />
                    <DetailRow label="Nome Prodotto" value={sale.productName} className="border-t-0" />
                    <DetailRow label="Quantità" value={<span className="font-bold">{sale.quantity || 1} pz</span>} />
                    <DetailRow label="ID Prodotto" value={<span className="font-mono">{sale.productId}</span>} />
                </>
            );
        case 'affiliate':
            return (
                <>
                    <SectionTitle title="Dettagli Affiliato" />
                    <DetailRow label="Nome Affiliato" value={sale.affiliateName} className="border-t-0" />
                    <DetailRow label="ID Affiliato" value={<span className="font-mono">{sale.affiliateId}</span>} />
                </>
            );
        case 'tracking':
            return (
                <>
                    <SectionTitle title="Tracking" />
                    <DetailRow label="Sub ID" value={sale.subId} className="border-t-0" />
                    <DetailRow label="Codice Tracciamento" value={sale.trackingCode || '-'}/>
                    <DetailRow label="Webhook URL" value={sale.webhookUrl} />
                    <DetailRow label="Stato Webhook" value={sale.webhookStatus} />
                    {isEditable && (
                        <>
                            <DetailRow label="User Agent" value={<span className="font-mono text-xs">{sale.user_agent}</span>} />
                            <DetailRow label="IP Address" value={<span className="font-mono">{sale.ip_address}</span>} />
                        </>
                    )}
                </>
            );
        default:
            return null;
    }
  };

  return (
    <div>
      <div className="flex gap-6 max-h-[70vh]">
          {/* Left Navigation */}
          <nav className="w-48 flex-shrink-0 border-r border-gray-200 pr-4">
              <ul className="space-y-1 sticky top-0">
                  {tabs.map(tab => (
                      <li key={tab.id}>
                          <button
                              onClick={() => setActiveTab(tab.id)}
                              className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-md transition-colors ${
                                  activeTab === tab.id
                                      ? 'bg-primary text-on-primary'
                                      : 'text-gray-700 hover:bg-gray-100'
                              }`}
                          >
                              {tab.label}
                          </button>
                      </li>
                  ))}
              </ul>
          </nav>
          
          {/* Right Content */}
          <div className="flex-grow overflow-y-auto pr-2">
              <dl>
                  {renderContent()}
              </dl>
          </div>
      </div>
      {isEditable && hasChanges && !['Duplicato', 'Test'].includes(sale.status) && (
        <div className="mt-6 pt-4 border-t border-gray-200 text-right">
            {error && <p className="text-red-500 text-sm mb-2 text-right">{error}</p>}
            <button
                onClick={handleSave}
                className="bg-primary text-on-primary font-bold py-2 px-6 rounded-lg hover:bg-primary-dark transition-colors duration-200"
            >
                Salva Modifiche
            </button>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;