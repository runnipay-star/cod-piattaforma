import React, { useState, useEffect, useMemo } from 'react';
import { PlatformSettings, User, UserRole, Product } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import SearchableSelect from './SearchableSelect';

interface SettingsPageProps {
    user: User;
    settings: PlatformSettings;
    products: Product[];
    onSaveAppearance: (settingsData: Partial<PlatformSettings> & { logoFile?: File | null }) => Promise<void>;
    onSaveIntegrations: (settingsData: Partial<PlatformSettings>) => Promise<void>;
    onSaveIpBlocklist: (ips: string[]) => Promise<void>;
}

type AlignmentOption = 'flex-start' | 'center' | 'flex-end';
type ActiveTab = 'ip' | 'appearance' | 'integrations' | 'calculator';

const LogoSizeControl: React.FC<{
    title: string,
    previewContent: React.ReactNode,
    width: string,
    height: string,
    onWidthChange: (value: string) => void,
    onHeightChange: (value: string) => void,
    children?: React.ReactNode,
}> = ({ title, previewContent, width, height, onWidthChange, onHeightChange, children }) => {
    return (
        <div className="p-4 border rounded-lg">
            <h4 className="font-semibold text-gray-700 mb-3">{title}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="flex items-center justify-center bg-gray-100 rounded-md p-4 min-h-[120px]">
                    {previewContent}
                </div>
                <div className="space-y-4">
                    <div>
                        <label htmlFor={`${title}-width`} className="text-sm font-medium text-gray-600 flex justify-between">
                            <span>Larghezza</span>
                            <span>{width}px</span>
                        </label>
                        <input
                            type="range"
                            id={`${title}-width`}
                            min="20"
                            max="200"
                            value={width}
                            onChange={(e) => onWidthChange(e.target.value)}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    <div>
                        <label htmlFor={`${title}-height`} className="text-sm font-medium text-gray-600 flex justify-between">
                            <span>Altezza</span>
                            <span>{height}px</span>
                        </label>
                        <input
                            type="range"
                            id={`${title}-height`}
                            min="20"
                            max="200"
                            value={height}
                            onChange={(e) => onHeightChange(e.target.value)}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
};

const ProfitCalculator: React.FC<{ products: Product[] }> = ({ products }) => {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedOfferId, setSelectedOfferId] = useState('single');

  const productOptions = useMemo(() => products.map(p => ({ value: p.id, label: p.name, refNumber: p.refNumber })), [products]);
  const selectedProduct = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);

  const offerOptions = useMemo(() => {
    if (!selectedProduct) return [];
    const singleOffer = { value: 'single', label: `1x Prodotto Singolo - €${selectedProduct.price.toFixed(2)}` };
    const bundleOffers = (selectedProduct.bundleOptions || []).map(b => ({
      value: b.id,
      label: `${b.quantity}x Offerta Multi-pack - €${b.price.toFixed(2)}`
    }));
    return [singleOffer, ...bundleOffers];
  }, [selectedProduct]);

  useEffect(() => {
    setSelectedOfferId('single'); // Reset offer when product changes
  }, [selectedProductId]);

  const calculation = useMemo(() => {
    if (!selectedProduct) return null;

    let offer;
    if (selectedOfferId === 'single') {
        offer = {
            price: selectedProduct.price,
            quantity: 1,
            commissionValue: selectedProduct.commissionValue,
            platformFee: selectedProduct.platformFee || 0,
        };
    } else {
        const bundle = selectedProduct.bundleOptions?.find(b => b.id === selectedOfferId);
        if (!bundle) return null;
        offer = {
            price: bundle.price,
            quantity: bundle.quantity,
            commissionValue: bundle.commissionValue,
            platformFee: bundle.platformFee || 0,
        };
    }
    
    const costOfGoods = (selectedProduct.costOfGoods || 0) * offer.quantity;
    const shippingCost = selectedProduct.shippingCost || 0;
    const shippingCharge = selectedProduct.shippingCharge || 0;
    const effectiveShippingCost = !(selectedProduct.freeShipping ?? true) ? Math.max(0, shippingCost - shippingCharge) : shippingCost;
    const fulfillmentCost = selectedProduct.fulfillmentCost || 0;
    const customerCareCommission = selectedProduct.customerCareCommission || 0;
    const affiliateCommission = offer.commissionValue;

    const totalCosts = costOfGoods + effectiveShippingCost + fulfillmentCost + customerCareCommission + affiliateCommission;
    const platformProfit = offer.platformFee;
    const totalRevenue = offer.price;

    return { totalRevenue, totalCosts, platformProfit, costOfGoods, shippingCost: effectiveShippingCost, fulfillmentCost, customerCareCommission, affiliateCommission };
  }, [selectedProduct, selectedOfferId]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Calcolatore di Profitto Piattaforma (per singola vendita)</h3>
        <p className="text-sm text-gray-500 mt-1">
          Stima il guadagno della piattaforma per la vendita di un prodotto, considerando tutti i costi associati.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Seleziona Prodotto</label>
          <SearchableSelect
            options={productOptions}
            value={selectedProductId}
            onChange={setSelectedProductId}
            placeholder="Cerca un prodotto..."
          />
        </div>
        {selectedProduct && (
          <div>
            <label htmlFor="offer-select" className="block text-sm font-medium text-gray-700">Seleziona Offerta</label>
            <select
              id="offer-select"
              value={selectedOfferId}
              onChange={e => setSelectedOfferId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            >
              {offerOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {calculation && selectedProduct && (
        <div className="mt-6 bg-gray-50 p-6 rounded-lg border">
          <h4 className="font-bold text-lg text-gray-800 mb-4">Risultato Simulazione</h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Ricavo Totale (Prezzo di vendita)</span>
              <span className="font-semibold text-green-600 text-base">+ €{calculation.totalRevenue.toFixed(2)}</span>
            </div>
            <div className="pl-4 border-l-2 border-gray-200 space-y-2 py-2">
              <div className="flex justify-between items-center"><span className="text-gray-500">Costo Acquisto Merce</span><span className="text-red-600">- €{calculation.costOfGoods.toFixed(2)}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-500">Commissione Affiliato</span><span className="text-red-600">- €{calculation.affiliateCommission.toFixed(2)}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">
                    Costo Spedizione
                    {!(selectedProduct.freeShipping ?? true) && <span className="text-xs ml-1">(netto di incasso)</span>}
                </span>
                <span className="text-red-600">- €{calculation.shippingCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center"><span className="text-gray-500">Costo Logistica</span><span className="text-red-600">- €{calculation.fulfillmentCost.toFixed(2)}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-500">Commissione Customer Care</span><span className="text-red-600">- €{calculation.customerCareCommission.toFixed(2)}</span></div>
            </div>
            <div className="flex justify-between items-center border-t pt-3">
              <span className="font-semibold text-gray-700">Totale Costi</span>
              <span className="font-bold text-red-600 text-base">- €{calculation.totalCosts.toFixed(2)}</span>
            </div>
             <div className="flex justify-between items-center border-t pt-3 mt-4">
              <span className="font-semibold text-gray-800 text-base">Profitto Piattaforma</span>
              <span className="font-extrabold text-primary text-xl">€{calculation.platformProfit.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StockInvestmentSimulator: React.FC<{ products: Product[] }> = ({ products }) => {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [stockQuantity, setStockQuantity] = useState(100);
  const [purchasePrice, setPurchasePrice] = useState(0);

  const productOptions = useMemo(() => products.map(p => ({ value: p.id, label: p.name, refNumber: p.refNumber })), [products]);
  const selectedProduct = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);

  useEffect(() => {
    if (selectedProduct) {
      setPurchasePrice(selectedProduct.costOfGoods || 0);
    }
  }, [selectedProduct]);

  const calculation = useMemo(() => {
    if (!selectedProduct || stockQuantity <= 0 || purchasePrice < 0) return null;

    const totalInvestment = stockQuantity * purchasePrice;
    const totalPotentialRevenue = stockQuantity * selectedProduct.price;

    const shippingCost = selectedProduct.shippingCost || 0;
    const shippingCharge = selectedProduct.shippingCharge || 0;
    const effectiveShippingCost = !(selectedProduct.freeShipping ?? true) ? Math.max(0, shippingCost - shippingCharge) : shippingCost;

    const totalAffiliateCommissions = stockQuantity * selectedProduct.commissionValue;
    const totalShippingCosts = stockQuantity * effectiveShippingCost;
    const totalFulfillmentCosts = stockQuantity * (selectedProduct.fulfillmentCost || 0);
    const totalCustomerCareCommissions = stockQuantity * (selectedProduct.customerCareCommission || 0);

    const totalVariableCosts = totalAffiliateCommissions + totalShippingCosts + totalFulfillmentCosts + totalCustomerCareCommissions;
    
    const totalNetProfit = totalPotentialRevenue - totalInvestment - totalVariableCosts;

    return { totalInvestment, totalPotentialRevenue, totalVariableCosts, totalNetProfit, totalAffiliateCommissions, totalShippingCosts, totalFulfillmentCosts, totalCustomerCareCommissions };
  }, [selectedProduct, stockQuantity, purchasePrice]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Simulatore di Investimento Stock</h3>
        <p className="text-sm text-gray-500 mt-1">
          Stima il profitto totale derivante dall'acquisto di uno stock di prodotti e dalla loro rivendita attraverso la piattaforma.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700">Seleziona Prodotto</label>
          <SearchableSelect
            options={productOptions}
            value={selectedProductId}
            onChange={setSelectedProductId}
            placeholder="Cerca un prodotto..."
          />
        </div>
        <div>
          <label htmlFor="stock-quantity" className="block text-sm font-medium text-gray-700">Quantità Stock (pz)</label>
          <input type="number" id="stock-quantity" value={stockQuantity} onChange={e => setStockQuantity(parseInt(e.target.value, 10) || 0)} min="1" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
        </div>
        <div>
          <label htmlFor="purchase-price" className="block text-sm font-medium text-gray-700">Costo Acquisto per Unità (€)</label>
          <input type="number" id="purchase-price" value={purchasePrice} onChange={e => setPurchasePrice(parseFloat(e.target.value) || 0)} min="0" step="0.01" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
        </div>
      </div>
      {calculation && selectedProduct && (
        <div className="mt-6 bg-gray-50 p-6 rounded-lg border">
            <h4 className="font-bold text-lg text-gray-800 mb-4">Risultato Simulazione Investimento</h4>
            <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center"><span className="text-gray-600">Ricavo Potenziale Totale</span><span className="font-semibold text-green-600 text-base">+ €{calculation.totalPotentialRevenue.toFixed(2)}</span></div>
                <div className="flex justify-between items-center"><span className="text-gray-600">Investimento Totale (Costo Stock)</span><span className="font-semibold text-red-600 text-base">- €{calculation.totalInvestment.toFixed(2)}</span></div>
                <div className="pl-4 border-l-2 border-gray-200 space-y-2 py-2 mt-2">
                    <p className="text-xs text-gray-500 font-semibold">Costi Variabili su Rivendita:</p>
                    <div className="flex justify-between items-center"><span className="text-gray-500">Totale Commissioni Affiliati</span><span className="text-red-600">- €{calculation.totalAffiliateCommissions.toFixed(2)}</span></div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500">
                            Totale Costi Spedizione
                             {!(selectedProduct.freeShipping ?? true) && <span className="text-xs ml-1">(netto di incasso)</span>}
                        </span>
                        <span className="text-red-600">- €{calculation.totalShippingCosts.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center"><span className="text-gray-500">Totale Costi Logistica</span><span className="text-red-600">- €{calculation.totalFulfillmentCosts.toFixed(2)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-500">Totale Commissioni C. Care</span><span className="text-red-600">- €{calculation.totalCustomerCareCommissions.toFixed(2)}</span></div>
                    <div className="flex justify-between items-center border-t pt-2 mt-1"><span className="font-semibold text-gray-600">Totale Costi Variabili</span><span className="font-semibold text-red-600">- €{calculation.totalVariableCosts.toFixed(2)}</span></div>
                </div>
                <div className="flex justify-between items-center border-t-2 pt-3 mt-4">
                    <span className="font-semibold text-gray-800 text-base">Profitto Netto Stimato</span>
                    <span className={`font-extrabold text-xl ${calculation.totalNetProfit >= 0 ? 'text-primary' : 'text-red-700'}`}>
                      €{calculation.totalNetProfit.toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

const SettingsPage: React.FC<SettingsPageProps> = ({ user, settings, products, onSaveAppearance, onSaveIntegrations, onSaveIpBlocklist }) => {
    const isAdmin = user.role === UserRole.ADMIN;
    const [activeTab, setActiveTab] = useState<ActiveTab>('ip');

    const [logoInputMethod, setLogoInputMethod] = useState<'upload' | 'url'>('upload');
    const [logoUrl, setLogoUrl] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [isSavingAppearance, setIsSavingAppearance] = useState(false);
    const [isSavingIntegrations, setIsSavingIntegrations] = useState(false);
    const [isSavingIpBlocklist, setIsSavingIpBlocklist] = useState(false);

    const [sizes, setSizes] = useState({
        sidebarOpenWidth: '80',
        sidebarOpenHeight: '56',
        sidebarClosedWidth: '56',
        sidebarClosedHeight: '56',
        loginWidth: '128',
        loginHeight: '128',
    });
    
    const [appearance, setAppearance] = useState({
        sidebarOpenBgColor: '#1a237e',
        sidebarOpenHAlign: 'center' as AlignmentOption,
        sidebarOpenVAlign: 'center' as AlignmentOption,
    });
    
    const [integrations, setIntegrations] = useState({
        apiKey: '',
        senderName: '',
        senderCompany: '',
        senderAddress: '',
        senderCity: '',
        senderZip: '',
        senderProvince: '',
        senderPhone: '',
        senderEmail: '',
        globalWebhookUrl: '',
    });

    const [blockedIps, setBlockedIps] = useState<string[]>([]);
    const [newIp, setNewIp] = useState('');
    const [ipError, setIpError] = useState('');

    useEffect(() => {
        const currentLogo = settings.platform_logo || '';
        setLogoPreview(currentLogo);
        setLogoUrl(currentLogo);
        if (currentLogo && (currentLogo.startsWith('http'))) {
            setLogoInputMethod('url');
        } else {
            setLogoInputMethod('upload');
        }

        setSizes({
            sidebarOpenWidth: settings.logo_sidebar_open_width || '80',
            sidebarOpenHeight: settings.logo_sidebar_open_height || '56',
            sidebarClosedWidth: settings.logo_sidebar_closed_width || '56',
            sidebarClosedHeight: settings.logo_sidebar_closed_height || '56',
            loginWidth: settings.logo_login_width || '128',
            loginHeight: settings.logo_login_height || '128',
        });
        setAppearance({
            sidebarOpenBgColor: settings.sidebar_open_bg_color || '#1a237e',
            sidebarOpenHAlign: settings.sidebar_open_horizontal_align || 'center',
            sidebarOpenVAlign: settings.sidebar_open_vertical_align || 'center',
        });
        setIntegrations({
            apiKey: settings.paccofacile_api_key || '',
            senderName: settings.sender_name || '',
            senderCompany: settings.sender_company || '',
            senderAddress: settings.sender_address || '',
            senderCity: settings.sender_city || '',
            senderZip: settings.sender_zip || '',
            senderProvince: settings.sender_province || '',
            senderPhone: settings.sender_phone || '',
            senderEmail: settings.sender_email || '',
            globalWebhookUrl: settings.global_webhook_url || '',
        });
        setBlockedIps(settings.blocked_ips || []);
    }, [settings]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            const previewUrl = URL.createObjectURL(file);
            setLogoPreview(previewUrl);
            setLogoUrl('');
        }
    };
    
    const handleLogoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const url = e.target.value;
        setLogoUrl(url);
        setLogoFile(null); // Clear file if URL is being typed
        if (url.startsWith('http://') || url.startsWith('https://')) {
            setLogoPreview(url);
        } else if (!url) {
            setLogoPreview(settings.platform_logo || null);
        }
    };

    const handleSizeChange = (key: keyof typeof sizes, value: string) => {
        setSizes(prev => ({ ...prev, [key]: value }));
    };
    
    const handleAppearanceChange = (key: keyof typeof appearance, value: string) => {
        setAppearance(prev => ({ ...prev, [key]: value as any }));
    };
    
    const handleIntegrationsChange = (key: keyof typeof integrations, value: string) => {
        setIntegrations(prev => ({ ...prev, [key]: value }));
    };

    const handleAddIp = () => {
        setIpError('');
        const trimmedIp = newIp.trim();
        
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))$/;
        
        if (!trimmedIp) {
            setIpError('Il campo IP non può essere vuoto.');
            return;
        }
        if (!ipRegex.test(trimmedIp)) {
            setIpError('Formato IP non valido (es. 192.168.1.1).');
            return;
        }
        if (blockedIps.includes(trimmedIp)) {
            setIpError('Questo IP è già nella lista.');
            return;
        }
        
        setBlockedIps(prev => [...prev, trimmedIp]);
        setNewIp('');
    };

    const handleRemoveIp = (ipToRemove: string) => {
        setBlockedIps(prev => prev.filter(ip => ip !== ipToRemove));
    };

    const handleSaveIpBlocklist = async () => {
        setIsSavingIpBlocklist(true);
        await onSaveIpBlocklist(blockedIps);
        setIsSavingIpBlocklist(false);
    };

    const hasIpBlocklistChanges = () => {
        const originalIps = new Set(settings.blocked_ips || []);
        const currentIps = new Set(blockedIps);
        if (originalIps.size !== currentIps.size) return true;
        for (const ip of originalIps) {
            if (!currentIps.has(ip)) return true;
        }
        return false;
    };

    const handleSaveAppearance = async () => {
        setIsSavingAppearance(true);
        const settingsData: Partial<PlatformSettings> & { logoFile?: File | null } = {
            logo_sidebar_open_width: sizes.sidebarOpenWidth,
            logo_sidebar_open_height: sizes.sidebarOpenHeight,
            logo_sidebar_closed_width: sizes.sidebarClosedWidth,
            logo_sidebar_closed_height: sizes.sidebarClosedHeight,
            logo_login_width: sizes.loginWidth,
            logo_login_height: sizes.loginHeight,
            sidebar_open_bg_color: appearance.sidebarOpenBgColor,
            sidebar_open_horizontal_align: appearance.sidebarOpenHAlign,
            sidebar_open_vertical_align: appearance.sidebarOpenVAlign,
        };
        
        if (logoInputMethod === 'upload') {
            settingsData.logoFile = logoFile;
        } else if (logoInputMethod === 'url') {
            settingsData.platform_logo = logoUrl;
        }

        await onSaveAppearance(settingsData);
        setIsSavingAppearance(false);
        setLogoFile(null);
    };

    const handleSaveIntegrations = async () => {
        setIsSavingIntegrations(true);
        const settingsData = {
            paccofacile_api_key: integrations.apiKey,
            sender_name: integrations.senderName,
            sender_company: integrations.senderCompany,
            sender_address: integrations.senderAddress,
            sender_city: integrations.senderCity,
            sender_zip: integrations.senderZip,
            sender_province: integrations.senderProvince,
            sender_phone: integrations.senderPhone,
            sender_email: integrations.senderEmail,
            global_webhook_url: integrations.globalWebhookUrl,
        };
        await onSaveIntegrations(settingsData);
        setIsSavingIntegrations(false);
    };
    
    const hasIntegrationsChanges = () => {
        if (integrations.apiKey !== (settings.paccofacile_api_key || '')) return true;
        if (integrations.senderName !== (settings.sender_name || '')) return true;
        if (integrations.senderCompany !== (settings.sender_company || '')) return true;
        if (integrations.senderAddress !== (settings.sender_address || '')) return true;
        if (integrations.senderCity !== (settings.sender_city || '')) return true;
        if (integrations.senderZip !== (settings.sender_zip || '')) return true;
        if (integrations.senderProvince !== (settings.sender_province || '')) return true;
        if (integrations.senderPhone !== (settings.sender_phone || '')) return true;
        if (integrations.senderEmail !== (settings.sender_email || '')) return true;
        if (integrations.globalWebhookUrl !== (settings.global_webhook_url || '')) return true;
        return false;
    };

    const hasAppearanceChanges = () => {
        if (logoFile) return true;
        if (logoUrl !== (settings.platform_logo || '')) return true;
        if (sizes.sidebarOpenWidth !== (settings.logo_sidebar_open_width || '80')) return true;
        if (sizes.sidebarOpenHeight !== (settings.logo_sidebar_open_height || '56')) return true;
        if (sizes.sidebarClosedWidth !== (settings.logo_sidebar_closed_width || '56')) return true;
        if (sizes.sidebarClosedHeight !== (settings.logo_sidebar_closed_height || '56')) return true;
        if (sizes.loginWidth !== (settings.logo_login_width || '128')) return true;
        if (sizes.loginHeight !== (settings.logo_login_height || '128')) return true;
        if (appearance.sidebarOpenBgColor !== (settings.sidebar_open_bg_color || '#1a237e')) return true;
        if (appearance.sidebarOpenHAlign !== (settings.sidebar_open_horizontal_align || 'center')) return true;
        if (appearance.sidebarOpenVAlign !== (settings.sidebar_open_vertical_align || 'center')) return true;
        return false;
    };
    
    const tabs = [
        { key: 'ip', label: 'Blocco IP', roles: [UserRole.ADMIN, UserRole.MANAGER] },
        { key: 'appearance', label: 'Aspetto', roles: [UserRole.ADMIN] },
        { key: 'integrations', label: 'Integrazioni', roles: [UserRole.ADMIN] },
        { key: 'calculator', label: 'Calcolatore Profitto', roles: [UserRole.ADMIN] },
    ].filter(tab => tab.roles.includes(user.role));

    return (
        <div className="p-8">
            <h2 className="text-3xl font-bold text-on-surface mb-6">Impostazioni Piattaforma</h2>

            <div className="bg-surface rounded-xl shadow-md max-w-4xl mx-auto">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex gap-6 px-6" aria-label="Tabs">
                         {tabs.map(tab => (
                             <button 
                                key={tab.key} 
                                onClick={() => setActiveTab(tab.key as ActiveTab)} 
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === tab.key
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.label}
                            </button>
                         ))}
                    </nav>
                </div>
                
                <div className="p-6">
                    {activeTab === 'ip' && (
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">Gestione Blocco IP</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Blocca specifici indirizzi IP dall'inviare ordini tramite i form HTML.
                                </p>
                                <div className="mt-6 space-y-6">
                                    <div>
                                        <label htmlFor="new-ip" className="block text-sm font-medium text-gray-700">Aggiungi indirizzo IP da bloccare</label>
                                        <div className="mt-1 flex items-center gap-2">
                                            <input 
                                                type="text" 
                                                id="new-ip" 
                                                value={newIp}
                                                onChange={(e) => setNewIp(e.target.value)}
                                                placeholder="Es. 123.45.67.89"
                                                className="flex-grow block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddIp}
                                                className="bg-secondary text-primary font-bold py-2 px-4 rounded-lg hover:bg-secondary-light transition-colors duration-200 flex-shrink-0"
                                            >
                                                Aggiungi
                                            </button>
                                        </div>
                                        {ipError && <p className="text-red-500 text-sm mt-1">{ipError}</p>}
                                    </div>
                                    
                                    <div>
                                        <h4 className="font-semibold text-gray-800">IP Attualmente Bloccati</h4>
                                        <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg bg-gray-50 p-2 space-y-2">
                                            {blockedIps.length > 0 ? (
                                                blockedIps.map(ip => (
                                                    <div key={ip} className="flex justify-between items-center bg-white p-2 rounded-md shadow-sm">
                                                        <span className="font-mono text-gray-800">{ip}</span>
                                                        <button
                                                            onClick={() => handleRemoveIp(ip)}
                                                            className="p-1 text-red-600 rounded-md hover:bg-red-100"
                                                            aria-label={`Rimuovi IP ${ip}`}
                                                        >
                                                            <TrashIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-center text-gray-500 p-4">Nessun IP bloccato.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-5 mt-4 border-t border-gray-200">
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={handleSaveIpBlocklist}
                                            disabled={isSavingIpBlocklist || !hasIpBlocklistChanges()}
                                            className="bg-primary text-on-primary font-bold py-2 px-6 rounded-lg hover:bg-primary-dark transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                        >
                                            {isSavingIpBlocklist ? 'Salvataggio...' : 'Salva Lista IP Bloccati'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'integrations' && isAdmin && (
                         <div className="space-y-8">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">Integrazioni e API</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Configura i servizi esterni come PaccoFacile.it e webhook globali.
                                </p>
                                <div className="mt-6 space-y-6">
                                    <div>
                                        <h4 className="font-semibold text-gray-800">Integrazione PaccoFacile.it</h4>
                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                            <div className="md:col-span-2">
                                                <label htmlFor="pf-api-key" className="block text-sm font-medium text-gray-700">Chiave API PaccoFacile.it</label>
                                                <input type="password" id="pf-api-key" value={integrations.apiKey} onChange={(e) => handleIntegrationsChange('apiKey', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                                            </div>
                                            <div>
                                                <label htmlFor="sender-name" className="block text-sm font-medium text-gray-700">Nome Mittente</label>
                                                <input type="text" id="sender-name" value={integrations.senderName} onChange={(e) => handleIntegrationsChange('senderName', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                                            </div>
                                            <div>
                                                <label htmlFor="sender-company" className="block text-sm font-medium text-gray-700">Azienda (Opzionale)</label>
                                                <input type="text" id="sender-company" value={integrations.senderCompany} onChange={(e) => handleIntegrationsChange('senderCompany', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label htmlFor="sender-address" className="block text-sm font-medium text-gray-700">Indirizzo Mittente</label>
                                                <input type="text" id="sender-address" value={integrations.senderAddress} onChange={(e) => handleIntegrationsChange('senderAddress', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                                            </div>
                                            <div>
                                                <label htmlFor="sender-city" className="block text-sm font-medium text-gray-700">Città</label>
                                                <input type="text" id="sender-city" value={integrations.senderCity} onChange={(e) => handleIntegrationsChange('senderCity', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                                            </div>
                                            <div>
                                                <label htmlFor="sender-zip" className="block text-sm font-medium text-gray-700">CAP</label>
                                                <input type="text" id="sender-zip" value={integrations.senderZip} onChange={(e) => handleIntegrationsChange('senderZip', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                                            </div>
                                            <div>
                                                <label htmlFor="sender-province" className="block text-sm font-medium text-gray-700">Provincia (Sigla)</label>
                                                <input type="text" id="sender-province" value={integrations.senderProvince} onChange={(e) => handleIntegrationsChange('senderProvince', e.target.value)} maxLength={2} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                                            </div>
                                            <div>
                                                <label htmlFor="sender-phone" className="block text-sm font-medium text-gray-700">Telefono</label>
                                                <input type="tel" id="sender-phone" value={integrations.senderPhone} onChange={(e) => handleIntegrationsChange('senderPhone', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label htmlFor="sender-email" className="block text-sm font-medium text-gray-700">Email</label>
                                                <input type="email" id="sender-email" value={integrations.senderEmail} onChange={(e) => handleIntegrationsChange('senderEmail', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-6 border-t border-gray-200">
                                        <h4 className="font-semibold text-gray-800">Webhook Globale</h4>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Questo URL verrà usato per inviare i dati di vendita per tutti i prodotti che non hanno un webhook specifico configurato nel loro form.
                                        </p>
                                        <div className="mt-4">
                                            <label htmlFor="global-webhook" className="block text-sm font-medium text-gray-700">URL Webhook Globale</label>
                                            <input 
                                                type="url" 
                                                id="global-webhook" 
                                                value={integrations.globalWebhookUrl} 
                                                onChange={(e) => handleIntegrationsChange('globalWebhookUrl', e.target.value)} 
                                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                                placeholder="https://iltuosito.com/api/global-webhook"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-5 mt-4 border-t border-gray-200">
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={handleSaveIntegrations}
                                            disabled={isSavingIntegrations || !hasIntegrationsChanges()}
                                            className="bg-primary text-on-primary font-bold py-2 px-6 rounded-lg hover:bg-primary-dark transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                        >
                                            {isSavingIntegrations ? 'Salvataggio...' : 'Salva Impostazioni Integrazioni'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'appearance' && isAdmin && (
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">Logo Piattaforma</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Carica un logo o inserisci un URL. Verrà visualizzato nella barra laterale e nella pagina di login.
                                </p>
                                <div className="mt-4 flex items-center gap-6">
                                    <div className="w-24 h-24 bg-gray-100 rounded-md flex items-center justify-center border">
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Anteprima Logo" className="max-w-full max-h-full object-contain" />
                                        ) : (
                                            <span className="text-xs text-gray-400">Nessun logo</span>
                                        )}
                                    </div>
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-4">
                                            <label className="flex items-center">
                                                <input type="radio" name="logoInputMethod" value="upload" checked={logoInputMethod === 'upload'} onChange={() => setLogoInputMethod('upload')} className="h-4 w-4 text-primary focus:ring-primary border-gray-300"/>
                                                <span className="ml-2 text-sm text-gray-700">Carica File</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input type="radio" name="logoInputMethod" value="url" checked={logoInputMethod === 'url'} onChange={() => setLogoInputMethod('url')} className="h-4 w-4 text-primary focus:ring-primary border-gray-300"/>
                                                <span className="ml-2 text-sm text-gray-700">Usa URL</span>
                                            </label>
                                        </div>
                                        {logoInputMethod === 'upload' ? (
                                            <div className="mt-4">
                                                <label htmlFor="logo-upload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark">
                                                    Seleziona Immagine
                                                </label>
                                                <input id="logo-upload" type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={handleFileChange} className="sr-only"/>
                                                <p className="mt-2 text-xs text-gray-500">
                                                    Consigliato: PNG o SVG con sfondo trasparente.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="mt-4">
                                                <label htmlFor="logo-url" className="block text-sm font-medium text-gray-700">URL del Logo</label>
                                                <input type="url" id="logo-url" value={logoUrl} onChange={handleLogoUrlChange} placeholder="https://esempio.com/logo.png" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"/>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-6 mt-8">
                                <h3 className="text-lg font-medium text-gray-900">Dimensioni e Stile Logo</h3>
                                
                                <LogoSizeControl
                                    title="Sidebar (Aperta)"
                                    width={sizes.sidebarOpenWidth}
                                    height={sizes.sidebarOpenHeight}
                                    onWidthChange={(v) => handleSizeChange('sidebarOpenWidth', v)}
                                    onHeightChange={(v) => handleSizeChange('sidebarOpenHeight', v)}
                                    previewContent={
                                        <div 
                                        className="w-48 h-20 flex p-2 rounded-md"
                                        style={{ 
                                            backgroundColor: appearance.sidebarOpenBgColor,
                                            justifyContent: appearance.sidebarOpenHAlign,
                                            alignItems: appearance.sidebarOpenVAlign,
                                        }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl font-bold text-secondary">MWS</span>
                                                {logoPreview && <img src={logoPreview} style={{ width: `${sizes.sidebarOpenWidth}px`, height: `${sizes.sidebarOpenHeight}px`, objectFit: 'contain' }} alt="logo" />}
                                            </div>
                                        </div>
                                    }
                                >
                                    <div className="pt-4 border-t mt-4 space-y-4">
                                        <div>
                                            <label htmlFor="sidebar-bg-color" className="text-sm font-medium text-gray-600">Colore Sfondo</label>
                                            <input type="color" id="sidebar-bg-color" value={appearance.sidebarOpenBgColor} onChange={e => handleAppearanceChange('sidebarOpenBgColor', e.target.value)} className="mt-1 w-full h-8 border border-gray-300 rounded-md"/>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="sidebar-h-align" className="text-sm font-medium text-gray-600">All. Orizzontale</label>
                                            <select id="sidebar-h-align" value={appearance.sidebarOpenHAlign} onChange={e => handleAppearanceChange('sidebarOpenHAlign', e.target.value)} className="mt-1 w-full border-gray-300 rounded-md text-sm">
                                                <option value="flex-start">Sinistra</option>
                                                <option value="center">Centro</option>
                                                <option value="flex-end">Destra</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="sidebar-v-align" className="text-sm font-medium text-gray-600">All. Verticale</label>
                                            <select id="sidebar-v-align" value={appearance.sidebarOpenVAlign} onChange={e => handleAppearanceChange('sidebarOpenVAlign', e.target.value)} className="mt-1 w-full border-gray-300 rounded-md text-sm">
                                                <option value="flex-start">Sopra</option>
                                                <option value="center">Centro</option>
                                                <option value="flex-end">Sotto</option>
                                            </select>
                                        </div>
                                        </div>
                                    </div>
                                </LogoSizeControl>
                                <LogoSizeControl
                                    title="Sidebar (Chiusa)"
                                    width={sizes.sidebarClosedWidth}
                                    height={sizes.sidebarClosedHeight}
                                    onWidthChange={(v) => handleSizeChange('sidebarClosedWidth', v)}
                                    onHeightChange={(v) => handleSizeChange('sidebarClosedHeight', v)}
                                    previewContent={
                                        <div className="w-20 h-20 bg-gradient-to-b from-primary to-primary-dark flex items-center justify-center p-2 rounded-md">
                                            {logoPreview && <img src={logoPreview} style={{ width: `${sizes.sidebarClosedWidth}px`, height: `${sizes.sidebarClosedHeight}px`, objectFit: 'contain' }} alt="logo" />}
                                        </div>
                                    }
                                />
                                <LogoSizeControl
                                    title="Pagina di Login"
                                    width={sizes.loginWidth}
                                    height={sizes.loginHeight}
                                    onWidthChange={(v) => handleSizeChange('loginWidth', v)}
                                    onHeightChange={(v) => handleSizeChange('loginHeight', v)}
                                    previewContent={
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="flex flex-col items-center justify-center gap-2 mb-1">
                                                <span className="text-2xl font-bold text-secondary">MWS</span>
                                                {logoPreview && <img src={logoPreview} style={{ width: `${sizes.loginWidth}px`, height: `${sizes.loginHeight}px`, objectFit: 'contain' }} alt="logo" />}
                                            </div>
                                            <span className="text-sm font-bold text-primary mt-1">Piattaforma Affiliati</span>
                                        </div>
                                    }
                                />
                            </div>
                            
                            <div className="pt-5 border-t border-gray-200 mt-8">
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleSaveAppearance}
                                        disabled={isSavingAppearance || !hasAppearanceChanges()}
                                        className="bg-primary text-on-primary font-bold py-2 px-6 rounded-lg hover:bg-primary-dark transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        {isSavingAppearance ? 'Salvataggio...' : 'Salva Aspetto e Logo'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'calculator' && isAdmin && (
                        <div className="space-y-10">
                            <ProfitCalculator products={products} />
                            <hr className="border-gray-300" />
                            <StockInvestmentSimulator products={products} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
