import React, { useState, useMemo } from 'react';
import { User, Affiliate, Manager, Transaction, UserRole, CustomerCareUser } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';

interface PaymentsPageProps {
    user: User;
    fullUserObject: Affiliate | Manager | CustomerCareUser | User;
    allUsersWithBalance: (User & { currentBalance?: number })[];
    transactions: Transaction[];
    onPayoutRequest: (userId: string, amount: number, paymentMethod: 'PayPal' | 'Bonifico Bancario' | 'Worldfili', paymentDetails: string) => Promise<{ success: boolean, error?: string }>;
    onTransferFunds: (fromUserId: string, toUserId: string, amount: number) => Promise<{ success: boolean, error?: string }>;
    onAdminTransferFunds: (fromUserId: string, toUserId: string, amount: number) => Promise<{ success: boolean; error?: string }>;
    onAdminAddCredit: (toUserId: string, amount: number, notes: string) => Promise<{ success: boolean; error?: string }>;
    onApproveTransaction: (transactionId: string) => void;
    onRejectTransaction: (transactionId: string) => void;
}

const StatCard: React.FC<{ title: string; value: string | number; color: string }> = ({ title, value, color }) => (
    <div className="bg-surface p-6 rounded-xl shadow-md flex flex-col">
        <h3 className="text-lg font-semibold text-gray-500">{title}</h3>
        <p className={`text-4xl font-bold mt-2 ${color}`}>{value}</p>
    </div>
);

const PaymentsPage: React.FC<PaymentsPageProps> = ({ user, fullUserObject, allUsersWithBalance, transactions, onPayoutRequest, onTransferFunds, onAdminTransferFunds, onApproveTransaction, onRejectTransaction, onAdminAddCredit }) => {
    const isManagerial = user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
    const isAffiliate = user.role === UserRole.AFFILIATE;
    const isCustomerCare = user.role === UserRole.CUSTOMER_CARE;
    
    const getDefaultTab = () => {
        if (user.role === UserRole.ADMIN) return 'requests';
        if (user.role === UserRole.MANAGER) return 'requests';
        if (isAffiliate || isCustomerCare) return 'payout';
        return 'payout'; // Fallback
    };

    const [activeTab, setActiveTab] = useState<'payout' | 'transfer' | 'history' | 'requests' | 'all_history' | 'admin_transfer' | 'add_credit'>(getDefaultTab());
    
    // Payout Form State
    const [payoutAmount, setPayoutAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'PayPal' | 'Bonifico Bancario' | 'Worldfili'>('PayPal');
    const [paymentDetails, setPaymentDetails] = useState('');
    const [payoutError, setPayoutError] = useState('');
    const [payoutSuccess, setPayoutSuccess] = useState('');
    
    // User Transfer Form State
    const [transferAmount, setTransferAmount] = useState('');
    const [recipientId, setRecipientId] = useState('');
    const [verifiedRecipient, setVerifiedRecipient] = useState<User | null>(null);
    const [transferError, setTransferError] = useState('');
    const [transferSuccess, setTransferSuccess] = useState('');

    // Admin Transfer Form State
    const [adminFromId, setAdminFromId] = useState('');
    const [adminToId, setAdminToId] = useState('');
    const [adminTransferAmount, setAdminTransferAmount] = useState('');
    const [verifiedSender, setVerifiedSender] = useState<(User & { currentBalance?: number }) | null>(null);
    const [verifiedReceiver, setVerifiedReceiver] = useState<(User & { currentBalance?: number }) | null>(null);
    const [adminTransferError, setAdminTransferError] = useState('');
    const [adminTransferSuccess, setAdminTransferSuccess] = useState('');

    // Admin Add Credit form state
    const [creditUserId, setCreditUserId] = useState('');
    const [creditAmount, setCreditAmount] = useState('');
    const [creditNotes, setCreditNotes] = useState('');
    const [creditError, setCreditError] = useState('');
    const [creditSuccess, setCreditSuccess] = useState('');

    const creditWorthyUsers = useMemo(() => {
        return allUsersWithBalance.filter(u => u.role === UserRole.AFFILIATE || u.role === UserRole.MANAGER || u.role === UserRole.CUSTOMER_CARE);
    }, [allUsersWithBalance]);

    const handleCreditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreditError('');
        setCreditSuccess('');
        const amount = parseFloat(creditAmount);
        if (!creditUserId) {
            setCreditError('Seleziona un utente.');
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            setCreditError('Inserisci un importo valido.');
            return;
        }

        const result = await onAdminAddCredit(creditUserId, amount, creditNotes);
        if (result.success) {
            setCreditSuccess('Credito aggiunto con successo!');
            setCreditUserId('');
            setCreditAmount('');
            setCreditNotes('');
        } else {
            setCreditError(result.error || 'Si è verificato un errore.');
        }
    };
    
    const userTransactions = useMemo(() => {
        return transactions.filter(t => t.userId === user.id || t.toUserId === user.id);
    }, [transactions, user.id]);

    const pendingPayouts = useMemo(() => {
        const allPending = transactions
            .filter(t => t.type === 'Payout' && t.status === 'Pending')
            .map(t => {
                const userRequesting = allUsersWithBalance.find(u => u.id === t.userId);
                return { ...t, userName: userRequesting?.name || 'Sconosciuto', userRole: userRequesting?.role };
            });

        if (user.role === UserRole.ADMIN) {
            return allPending.filter(t => t.userRole === UserRole.AFFILIATE || t.userRole === UserRole.MANAGER || t.userRole === UserRole.CUSTOMER_CARE);
        }
        if (user.role === UserRole.MANAGER) {
            return allPending.filter(t => t.userRole === UserRole.AFFILIATE || t.userRole === UserRole.CUSTOMER_CARE);
        }
        return [];
    }, [transactions, allUsersWithBalance, user.role]);

    const handlePayoutSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPayoutError('');
        setPayoutSuccess('');
        const amount = parseFloat(payoutAmount);
        if (isNaN(amount) || amount <= 0) {
            setPayoutError('Inserisci un importo valido.');
            return;
        }
        if (!paymentDetails.trim()) {
            setPayoutError('I dettagli di pagamento sono obbligatori.');
            return;
        }
        const result = await onPayoutRequest(user.id, amount, paymentMethod, paymentDetails);
        if (result.success) {
            setPayoutSuccess('Richiesta di pagamento inviata con successo!');
            setPayoutAmount('');
            setPaymentDetails('');
        } else {
            setPayoutError(result.error || 'Si è verificato un errore.');
        }
    };
    
    const handleVerifyRecipient = () => {
        setTransferError('');
        setVerifiedRecipient(null);
        if (!recipientId.trim()) {
            setTransferError('Inserisci un ID destinatario.');
            return;
        }
        if (recipientId.trim().toUpperCase() === user.id.toUpperCase()){
            setTransferError('Non puoi trasferire fondi a te stesso.');
            return;
        }
        const foundUser = allUsersWithBalance.find(u => u.id.toUpperCase() === recipientId.trim().toUpperCase() && u.role !== UserRole.LOGISTICS && u.role !== UserRole.ADMIN);
        if (foundUser) {
            setVerifiedRecipient(foundUser);
        } else {
            setTransferError('Nessun utente trovato con questo ID.');
        }
    };
    
    const handleTransferSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!verifiedRecipient) {
            setTransferError('Devi prima verificare un destinatario valido.');
            return;
        }
        setTransferError('');
        setTransferSuccess('');
        const amount = parseFloat(transferAmount);
        if (isNaN(amount) || amount <= 0) {
            setTransferError('Inserisci un importo valido.');
            return;
        }
        
        const result = await onTransferFunds(user.id, verifiedRecipient.id, amount);
        if (result.success) {
            setTransferSuccess(`Trasferimento di €${amount.toFixed(2)} a ${verifiedRecipient.name} completato!`);
            setTransferAmount('');
            setRecipientId('');
            setVerifiedRecipient(null);
        } else {
            setTransferError(result.error || 'Si è verificato un errore.');
        }
    };

    const handleAdminVerifyUser = (id: string, type: 'sender' | 'receiver') => {
        setAdminTransferError('');
        const foundUser = allUsersWithBalance.find(u => u.id.toUpperCase() === id.trim().toUpperCase() && (u.role === UserRole.AFFILIATE || u.role === UserRole.MANAGER || u.role === UserRole.CUSTOMER_CARE));
        if (!foundUser) {
            setAdminTransferError('Utente non trovato o non idoneo al trasferimento.');
            if (type === 'sender') setVerifiedSender(null);
            if (type === 'receiver') setVerifiedReceiver(null);
            return;
        }
        if (type === 'sender') {
            if(foundUser.id === verifiedReceiver?.id) {
                setAdminTransferError('Mittente e destinatario non possono essere uguali.');
                setVerifiedSender(null);
                return;
            }
            setVerifiedSender(foundUser);
        }
        if (type === 'receiver') {
             if(foundUser.id === verifiedSender?.id) {
                setAdminTransferError('Mittente e destinatario non possono essere uguali.');
                setVerifiedReceiver(null);
                return;
            }
            setVerifiedReceiver(foundUser);
        }
    }

    const handleAdminTransferSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAdminTransferError('');
        setAdminTransferSuccess('');

        if (!verifiedSender || !verifiedReceiver) {
            setAdminTransferError('Verifica sia il mittente che il destinatario.');
            return;
        }

        const amount = parseFloat(adminTransferAmount);
        if (isNaN(amount) || amount <= 0) {
            setAdminTransferError('Importo non valido.');
            return;
        }

        const result = await onAdminTransferFunds(verifiedSender.id, verifiedReceiver.id, amount);
        if (result.success) {
            setAdminTransferSuccess(`Trasferimento di €${amount.toFixed(2)} da ${verifiedSender.name} a ${verifiedReceiver.name} completato!`);
            setAdminFromId('');
            setAdminToId('');
            setAdminTransferAmount('');
            setVerifiedSender(null);
            setVerifiedReceiver(null);
        } else {
            setAdminTransferError(result.error || 'Errore durante il trasferimento.');
        }
    }

    const getStatusBadge = (status: Transaction['status']) => {
        const styles = {
            Pending: 'bg-yellow-100 text-yellow-800',
            Completed: 'bg-green-100 text-green-800',
            Failed: 'bg-red-100 text-red-800',
        };
        return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>{status}</span>;
    };

    const navTabs = [
        { key: 'requests', label: 'Richieste Pagamento', roles: [UserRole.ADMIN, UserRole.MANAGER] },
        { key: 'admin_transfer', label: 'Trasferimento Admin', roles: [UserRole.ADMIN] },
        { key: 'add_credit', label: 'Aggiungi Credito', roles: [UserRole.ADMIN] },
        { key: 'payout', label: 'Richiedi Pagamento', roles: [UserRole.AFFILIATE, UserRole.MANAGER, UserRole.CUSTOMER_CARE] },
        { key: 'transfer', label: 'Trasferisci Fondi', roles: [UserRole.AFFILIATE, UserRole.MANAGER] },
        { key: 'history', label: 'Cronologia', roles: [UserRole.AFFILIATE, UserRole.MANAGER, UserRole.CUSTOMER_CARE] },
        { key: 'all_history', label: 'Cronologia Globale', roles: [UserRole.ADMIN] },
    ].filter(tab => tab.roles.includes(user.role));

    return (
        <div className="p-8">
            <h2 className="text-3xl font-bold text-on-surface mb-6">Pagamenti</h2>
            
            {!isManagerial && (
                 <div className="mb-8">
                    <StatCard title="Saldo Disponibile" value={`€${((fullUserObject as (Affiliate | CustomerCareUser)).currentBalance || 0).toFixed(2)}`} color="text-green-600" />
                </div>
            )}

            <div className="bg-surface rounded-xl shadow-md">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex gap-6 px-6" aria-label="Tabs">
                         {navTabs.map(tab => (
                             <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                {tab.label}
                                {tab.key === 'requests' && pendingPayouts.length > 0 && <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">{pendingPayouts.length}</span>}
                            </button>
                         ))}
                    </nav>
                </div>
                
                <div className="p-6">
                    {activeTab === 'requests' && isManagerial && (
                        <div>
                            <h3 className="text-xl font-bold text-on-surface mb-4">Richieste di Pagamento in Sospeso</h3>
                            <div className="overflow-x-auto">
                               <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utente</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Importo</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metodo</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dettagli</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {pendingPayouts.map(t => (
                                            <tr key={t.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(t.createdAt).toLocaleDateString('it-IT')}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.userName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">€{t.amount.toFixed(2)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.paymentMethod}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{t.paymentDetails}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm flex items-center gap-2">
                                                    <button onClick={() => onApproveTransaction(t.id)} className="p-2 text-green-600 hover:bg-green-100 rounded-full" title="Approva"><CheckCircleIcon className="w-5 h-5"/></button>
                                                    <button onClick={() => onRejectTransaction(t.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full" title="Rifiuta"><XCircleIcon className="w-5 h-5"/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {pendingPayouts.length === 0 && <p className="text-center text-gray-500 py-8">Nessuna richiesta di pagamento in sospeso.</p>}
                            </div>
                        </div>
                    )}
                    {activeTab === 'add_credit' && user.role === UserRole.ADMIN && (
                        <form onSubmit={handleCreditSubmit} className="max-w-lg mx-auto space-y-6">
                            <h3 className="text-xl font-bold text-on-surface mb-4 text-center">Aggiungi Credito Manuale</h3>
                            <div>
                                <label htmlFor="creditUser" className="block text-sm font-medium text-gray-700">Utente</label>
                                <select id="creditUser" value={creditUserId} onChange={e => setCreditUserId(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                                    <option value="" disabled>Seleziona un utente</option>
                                    {creditWorthyUsers.map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="creditAmount" className="block text-sm font-medium text-gray-700">Importo da Aggiungere (€)</label>
                                <input type="number" id="creditAmount" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} required min="0.01" step="0.01" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="creditNotes" className="block text-sm font-medium text-gray-700">Note (Opzionale)</label>
                                <textarea id="creditNotes" value={creditNotes} onChange={e => setCreditNotes(e.target.value)} rows={3} placeholder="Es: Bonus performance mese di Giugno" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                            </div>
                            {creditError && <p className="text-red-500 text-sm text-center">{creditError}</p>}
                            {creditSuccess && <p className="text-green-600 text-sm text-center">{creditSuccess}</p>}
                            <div className="text-right">
                                <button type="submit" className="bg-primary text-on-primary font-bold py-2 px-6 rounded-lg hover:bg-primary-dark transition-colors duration-200">Aggiungi Credito</button>
                            </div>
                        </form>
                    )}
                    {activeTab === 'admin_transfer' && user.role === UserRole.ADMIN && (
                        <form onSubmit={handleAdminTransferSubmit} className="max-w-xl mx-auto space-y-6">
                            <h3 className="text-xl font-bold text-on-surface mb-4 text-center">Trasferimento Fondi Amministrativo</h3>
                            <div>
                                <label htmlFor="adminFromId" className="block text-sm font-medium text-gray-700">ID Utente Mittente</label>
                                <div className="mt-1 flex rounded-md shadow-sm">
                                    <input type="text" id="adminFromId" value={adminFromId} onChange={e => {setAdminFromId(e.target.value); setVerifiedSender(null);}} required className="block w-full flex-1 rounded-none rounded-l-md border-gray-300 px-3 py-2 focus:border-primary focus:ring-primary sm:text-sm" />
                                    <button type="button" onClick={() => handleAdminVerifyUser(adminFromId, 'sender')} className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Verifica</button>
                                </div>
                                {verifiedSender && <p className="text-green-600 text-sm mt-1">Mittente: <strong>{verifiedSender.name}</strong> - Saldo: <strong className="font-mono">€{verifiedSender.currentBalance?.toFixed(2)}</strong></p>}
                            </div>
                             <div>
                                <label htmlFor="adminToId" className="block text-sm font-medium text-gray-700">ID Utente Destinatario</label>
                                <div className="mt-1 flex rounded-md shadow-sm">
                                    <input type="text" id="adminToId" value={adminToId} onChange={e => {setAdminToId(e.target.value); setVerifiedReceiver(null);}} required className="block w-full flex-1 rounded-none rounded-l-md border-gray-300 px-3 py-2 focus:border-primary focus:ring-primary sm:text-sm" />
                                    <button type="button" onClick={() => handleAdminVerifyUser(adminToId, 'receiver')} className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Verifica</button>
                                </div>
                                {verifiedReceiver && <p className="text-green-600 text-sm mt-1">Destinatario: <strong>{verifiedReceiver.name}</strong> - Saldo: <strong className="font-mono">€{verifiedReceiver.currentBalance?.toFixed(2)}</strong></p>}
                            </div>
                            <div>
                                <label htmlFor="adminTransferAmount" className="block text-sm font-medium text-gray-700">Importo da Trasferire (€)</label>
                                <input type="number" id="adminTransferAmount" value={adminTransferAmount} onChange={e => setAdminTransferAmount(e.target.value)} required min="0.01" step="0.01" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                            </div>
                            {adminTransferError && <p className="text-red-500 text-sm text-center">{adminTransferError}</p>}
                            {adminTransferSuccess && <p className="text-green-600 text-sm text-center">{adminTransferSuccess}</p>}
                            <div className="text-right">
                                <button type="submit" disabled={!verifiedSender || !verifiedReceiver} className="bg-primary text-on-primary font-bold py-2 px-6 rounded-lg hover:bg-primary-dark transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed">Esegui Trasferimento</button>
                            </div>
                        </form>
                    )}
                    {activeTab === 'payout' && (isAffiliate || user.role === UserRole.MANAGER || isCustomerCare) && (
                        <form onSubmit={handlePayoutSubmit} className="max-w-lg mx-auto space-y-6">
                            <p className="text-center text-lg">Saldo disponibile: <strong className="text-green-600">€{((fullUserObject as (Affiliate | CustomerCareUser)).currentBalance || 0).toFixed(2)}</strong></p>
                            <div>
                                <label htmlFor="payoutAmount" className="block text-sm font-medium text-gray-700">Importo da Prelevare (€)</label>
                                <input type="number" id="payoutAmount" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} required min="1" step="0.01" max={((fullUserObject as (Affiliate | CustomerCareUser)).currentBalance || 0)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700">Metodo di Pagamento</label>
                                <select id="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                                    <option>PayPal</option>
                                    <option>Bonifico Bancario</option>
                                    <option>Worldfili</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="paymentDetails" className="block text-sm font-medium text-gray-700">
                                    {paymentMethod === 'PayPal' 
                                        ? 'Email PayPal' 
                                        : paymentMethod === 'Bonifico Bancario'
                                            ? 'IBAN'
                                            : 'ID Profilo Worldfili'}
                                </label>
                                <input type="text" id="paymentDetails" value={paymentDetails} onChange={(e) => setPaymentDetails(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                            </div>
                            {payoutError && <p className="text-red-500 text-sm text-center">{payoutError}</p>}
                            {payoutSuccess && <p className="text-green-600 text-sm text-center">{payoutSuccess}</p>}
                            <div className="text-right">
                                <button type="submit" className="bg-primary text-on-primary font-bold py-2 px-6 rounded-lg hover:bg-primary-dark transition-colors duration-200">Invia Richiesta</button>
                            </div>
                        </form>
                    )}
                    {activeTab === 'transfer' && (isAffiliate || user.role === UserRole.MANAGER) && (
                        <form onSubmit={handleTransferSubmit} className="max-w-lg mx-auto space-y-6">
                            <p className="text-center text-lg">Saldo disponibile: <strong className="text-green-600">€{((fullUserObject as Affiliate).currentBalance || 0).toFixed(2)}</strong></p>
                            <div>
                                <label htmlFor="recipientId" className="block text-sm font-medium text-gray-700">ID Utente Destinatario</label>
                                <div className="mt-1 flex rounded-md shadow-sm">
                                    <input type="text" id="recipientId" value={recipientId} onChange={(e) => { setRecipientId(e.target.value); setVerifiedRecipient(null); }} required className="block w-full flex-1 rounded-none rounded-l-md border-gray-300 px-3 py-2 focus:border-primary focus:ring-primary sm:text-sm" />
                                    <button type="button" onClick={handleVerifyRecipient} className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Verifica</button>
                                </div>
                                {verifiedRecipient && <p className="text-green-600 text-sm mt-1">Destinatario: <strong>{verifiedRecipient.name}</strong></p>}
                            </div>
                            <div>
                                <label htmlFor="transferAmount" className="block text-sm font-medium text-gray-700">Importo da Trasferire (€)</label>
                                <input type="number" id="transferAmount" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} required min="1" step="0.01" max={((fullUserObject as Affiliate).currentBalance || 0)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                            </div>
                            {transferError && <p className="text-red-500 text-sm text-center">{transferError}</p>}
                            {transferSuccess && <p className="text-green-600 text-sm text-center">{transferSuccess}</p>}
                            <div className="text-right">
                                <button type="submit" disabled={!verifiedRecipient} className="bg-primary text-on-primary font-bold py-2 px-6 rounded-lg hover:bg-primary-dark transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed">Trasferisci Ora</button>
                            </div>
                        </form>
                    )}
                     {activeTab === 'history' && (isAffiliate || user.role === UserRole.MANAGER || isCustomerCare) && (
                        <div className="overflow-x-auto">
                           <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dettagli</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Importo</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stato</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {userTransactions.map(t => {
                                        const isCredit = (t.type === 'Transfer' && t.toUserId === user.id) || (t.type === 'Payout' && t.status === 'Failed') || (t.type === 'Adjustment' && t.toUserId === user.id);
                                        return (
                                        <tr key={t.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(t.createdAt).toLocaleString('it-IT')}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.type}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {t.type === 'Payout' && `Verso ${t.paymentMethod}: ${t.paymentDetails}`}
                                                {t.type === 'Transfer' && (
                                                    t.fromUserId === user.id 
                                                    ? `A: ${t.toUserName}` 
                                                    : `Da: ${t.fromUserName}`
                                                )}
                                                {t.type === 'Adjustment' && `Credito da ${t.fromUserName}. ${t.notes ? `Note: ${t.notes}`:''}`}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                                                {isCredit ? '+' : '-'} €{t.amount.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">{getStatusBadge(t.status)}</td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                            {userTransactions.length === 0 && <p className="text-center text-gray-500 py-8">Nessuna transazione trovata.</p>}
                        </div>
                    )}
                    {activeTab === 'all_history' && user.role === UserRole.ADMIN && (
                         <div className="overflow-x-auto">
                           <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utente</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dettagli</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Importo</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stato</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {transactions.map(t => {
                                        const transactionUser = allUsersWithBalance.find(u => u.id === t.userId);
                                        return(
                                            <tr key={t.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(t.createdAt).toLocaleString('it-IT')}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">{transactionUser?.name || 'N/A'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.type}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {t.type === 'Payout' && `Richiesta di ${allUsersWithBalance.find(u => u.id === t.userId)?.name}`}
                                                    {t.type === 'Transfer' && `Da ${t.fromUserName} a ${t.toUserName}`}
                                                    {t.type === 'Adjustment' && `A: ${t.toUserName}`}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">€{t.amount.toFixed(2)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">{getStatusBadge(t.status)}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                            {transactions.length === 0 && <p className="text-center text-gray-500 py-8">Nessuna transazione trovata.</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentsPage;