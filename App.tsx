import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ProductList from './components/ProductList';
import AffiliateManager from './components/AffiliateManager';
import ManagerList from './components/ManagerList';
import OrderList from './components/OrderList';
import Modal from './components/Modal';
import ProductForm from './components/ProductForm';
import AffiliateForm from './components/AffiliateForm';
import ManagerForm from './components/ManagerForm';
import ProductDetail from './components/ProductDetail';
import OrderDetail from './components/OrderDetail';
import NicheManager from './components/NicheManager';
import Performance from './components/Performance';
import ProfilePage from './components/ProfilePage';
import PaymentsPage from './components/PaymentsPage';
import NotificationManager from './components/NotificationManager';
import NotificationPopupHost from './components/NotificationPopupHost';
import NotificationDetailView from './components/NotificationDetailView';
import NotificationListView from './components/NotificationListView';
import AssistancePage from './components/AssistancePage';
import TicketDetailView from './components/TicketDetailView';
import TicketForm from './components/TicketForm';
import CustomerContactModal from './components/CustomerContactModal';
import WhatsAppTemplateModal from './components/WhatsAppTemplateModal';
import LogisticsOrderModal from './components/LogisticsOrderModal';
import HeaderCommissionModal from './components/HeaderCommissionModal';
import SettingsPage from './components/SettingsPage';
import AccountingPage from './components/AccountingPage';
import PaccoFacileModal from './components/PaccoFacileModal';
import InventoryPage from './components/InventoryPage';
import PlatformCheckModal from './components/PlatformCheckModal';
import * as db from './database';
import { User, UserRole, Product, Affiliate, Sale, Manager, LogisticsUser, Notification, BundleOption, Transaction, Ticket, TicketReply, TicketStatus, SaleStatus, CustomerCareUser, Admin, PlatformSettings, StockExpense, ContactHistoryItem } from './types';

type View = 'dashboard' | 'products' | 'product-detail' | 'affiliates' | 'orders' | 'managers' | 'performance' | 'profile' | 'notifications' | 'notification-detail' | 'pagamenti' | 'assistenza' | 'ticket-detail' | 'settings' | 'contabilita' | 'magazzino';

const generateId = () => Math.random().toString(36).substring(2, 10).toUpperCase();

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [logistics, setLogistics] = useState<LogisticsUser[]>([]);
  const [customerCareUsers, setCustomerCareUsers] = useState<CustomerCareUser[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({});
  const [stockExpenses, setStockExpenses] = useState<StockExpense[]>([]);

  // Modals and view states
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAffiliateFormOpen, setIsAffiliateFormOpen] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null);
  const [isManagerFormOpen, setIsManagerFormOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<Manager | null>(null);
  const [isTicketFormOpen, setIsTicketFormOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Sale | null>(null);
  const [contactingSale, setContactingSale] = useState<Sale | null>(null);
  const [managingSale, setManagingSale] = useState<Sale | null>(null);
  const [shippingSale, setShippingSale] = useState<Sale | null>(null);
  const [viewingNotification, setViewingNotification] = useState<Notification | null>(null);
  const [viewingTicket, setViewingTicket] = useState<Ticket | null>(null);
  const [niches, setNiches] = useState<string[]>([]);
  const [isNicheModalOpen, setIsNicheModalOpen] = useState(false);
  const [whatsAppMessageTemplate, setWhatsAppMessageTemplate] = useState('Ciao {customerName}, grazie per aver acquistato {productName}! L\'importo totale da pagare al corriere è di €{saleAmount}. Per confermare la spedizione, ti basta rispondere a questo messaggio con il testo: *Si, spedite*');
  const [isWhatsAppTemplateModalOpen, setIsWhatsAppTemplateModalOpen] = useState(false);
  const [isCommissionDetailsModalOpen, setIsCommissionDetailsModalOpen] = useState(false);
  const [isPlatformCheckModalOpen, setIsPlatformCheckModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ products, admins, affiliates, managers, logisticsUsers, customerCareUsers, sales, notifications, tickets, transactions, stockExpenses }, settings] = await Promise.all([
        db.fetchAllInitialData(),
        db.getSettings()
    ]);
    setProducts(products || []);
    setAdmins(admins || []);
    setAffiliates(affiliates || []);
    setManagers(managers || []);
    setLogistics(logisticsUsers || []);
    setCustomerCareUsers(customerCareUsers || []);
    setSales(sales || []);
    setNotifications(notifications || []);
    setTickets(tickets as Ticket[] || []);
    setTransactions(transactions || []);
    setStockExpenses(stockExpenses || []);
    setPlatformSettings(settings);
    // FIX: Cast products to Product[] to ensure `p.niche` is correctly typed as a string.
    const initialNiches = new Set(((products || []) as Product[]).map(p => p.niche));
    setNiches(Array.from(initialNiches));
    setLoading(false);
  }, []);

  const refreshData = useCallback(async () => {
    // This function re-fetches data without triggering the global loading screen.
    const [{ products, admins, affiliates, managers, logisticsUsers, customerCareUsers, sales, notifications, tickets, transactions, stockExpenses }, settings] = await Promise.all([
        db.fetchAllInitialData(),
        db.getSettings()
    ]);
    setProducts(products || []);
    setAdmins(admins || []);
    setAffiliates(affiliates || []);
    setManagers(managers || []);
    setLogistics(logisticsUsers || []);
    setCustomerCareUsers(customerCareUsers || []);
    setSales(sales || []);
    setNotifications(notifications || []);
    setTickets(tickets as Ticket[] || []);
    setTransactions(transactions || []);
    setStockExpenses(stockExpenses || []);
    setPlatformSettings(settings);
    // FIX: Cast products to Product[] to ensure `p.niche` is correctly typed as a string.
    const initialNiches = new Set(((products || []) as Product[]).map(p => p.niche));
    setNiches(Array.from(initialNiches));
  }, []);


  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userObject: User = JSON.parse(storedUser);
        setUser(userObject);
        const storedView = localStorage.getItem('view') as View;
        setView(storedView || (userObject.role === UserRole.CUSTOMER_CARE ? 'orders' : 'dashboard'));
      } catch (error) {
        console.error("Failed to parse user from localStorage:", error);
        localStorage.removeItem('user');
        localStorage.removeItem('view');
      }
    }
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (platformSettings.whatsapp_welcome_template) {
        setWhatsAppMessageTemplate(platformSettings.whatsapp_welcome_template);
    }
  }, [platformSettings.whatsapp_welcome_template]);
  
  useEffect(() => {
    if (!user) return; // Don't subscribe if no user is logged in

    const channel = db.supabase
      .channel('realtime-products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          console.log('Real-time product change received!', payload);
          if (payload.eventType === 'INSERT') {
            const newProduct = payload.new as Product;
            setProducts(currentProducts => {
              if (currentProducts.find(p => p.id === newProduct.id)) {
                return currentProducts;
              }
              return [...currentProducts, newProduct];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedProduct = payload.new as Product;
            setProducts(currentProducts =>
              currentProducts.map(p => (p.id === updatedProduct.id ? updatedProduct : p))
            );
            setViewingProduct(currentViewingProduct => 
                currentViewingProduct?.id === updatedProduct.id ? updatedProduct : currentViewingProduct
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedProduct = payload.old as Partial<Product>;
            setProducts(currentProducts => currentProducts.filter(p => p.id !== deletedProduct.id));
          }
        }
      )
      .subscribe();

    return () => {
      db.supabase.removeChannel(channel);
    };
  }, [user]);

  const processedSales = useMemo(() => {
    const salesSortedByDateAsc = [...sales]
        .filter(s => s.status !== 'Test') // Escludi gli ordini di test dal controllo duplicati
        .sort((a, b) => new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime());
        
    const seenNameProductPairs = new Set<string>();
    const seenPhoneProductPairs = new Set<string>();
    const duplicateIds = new Set<string>();
    
    for (const sale of salesSortedByDateAsc) {
        const nameKey = sale.customerName ? `${sale.productId}|${sale.customerName.toLowerCase().trim()}` : null;
        const phoneKey = sale.customerPhone ? `${sale.productId}|${sale.customerPhone.replace(/\s/g, '')}` : null;
        
        if ((nameKey && seenNameProductPairs.has(nameKey)) || (phoneKey && seenPhoneProductPairs.has(phoneKey))) {
            duplicateIds.add(sale.id);
        }
        
        if (nameKey) seenNameProductPairs.add(nameKey);
        if (phoneKey) seenPhoneProductPairs.add(phoneKey);
    }

    return sales.map(sale => {
        if (sale.status === 'Test') return sale; // Mantieni lo stato 'Test' inalterato
        return duplicateIds.has(sale.id) && sale.status !== 'Duplicato'
            ? { ...sale, status: 'Duplicato' as SaleStatus } 
            : sale
    });
  }, [sales]);

  const allVisibleSales = useMemo(() => {
    if (!user) return [];
    
    // Filter out manual bonus sales from order-related views
    const regularSales = processedSales.filter(s => s.productId !== 'BONUS-MANUALE' && s.productId !== 'BONUS-DEBIT');

    if (user.role === UserRole.AFFILIATE) {
      return regularSales.filter(s => s.affiliateId === user.id);
    }
    return regularSales;
  }, [user, processedSales]);

  const calculatedBalances = useMemo(() => {
    const balances: { [userId: string]: number } = {};
    const allUsersForCalc = [
      ...affiliates,
      ...managers,
      ...customerCareUsers,
    ];

    for (const user of allUsersForCalc) {
        let totalEarnedCommissions = 0;
        if (user.role === UserRole.CUSTOMER_CARE) {
            totalEarnedCommissions = sales
                .filter(s => s.lastContactedBy === user.id && ['Consegnato'].includes(s.status))
                .reduce((sum, sale) => {
                    const product = products.find(p => p.id === sale.productId);
                    return sum + (product?.customerCareCommission || 0);
                }, 0);
        } else {
            totalEarnedCommissions = sales
                .filter(s => s.affiliateId === user.id && (s.isBonus || ['Svincolato', 'Consegnato'].includes(s.status)))
                .reduce((sum, s) => sum + s.commissionAmount, 0);
        }

        // 2. Calculate effects of transactions
        const userTransactions = transactions.filter(t => t.userId === user.id || t.toUserId === user.id || t.fromUserId === user.id);

        const totalPayouts = userTransactions
            .filter(t => t.type === 'Payout' && t.userId === user.id && t.status === 'Completed')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalTransfersSent = userTransactions
            .filter(t => t.type === 'Transfer' && t.fromUserId === user.id && t.status === 'Completed')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalTransfersReceived = userTransactions
            .filter(t => t.type === 'Transfer' && t.toUserId === user.id && t.status === 'Completed')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const totalAdjustments = userTransactions
            .filter(t => t.type === 'Adjustment' && t.toUserId === user.id && t.status === 'Completed')
            .reduce((sum, t) => sum + t.amount, 0);

        balances[user.id] = totalEarnedCommissions + totalTransfersReceived + totalAdjustments - totalTransfersSent - totalPayouts;
    }

    return balances;
  }, [sales, transactions, affiliates, managers, customerCareUsers, products]);


  const allUsersWithBalance = useMemo(() => {
    const users: (User & { role: UserRole; currentBalance?: number })[] = [
      ...admins.map(a => ({ id: a.id, name: a.name, email: a.email, role: UserRole.ADMIN, currentBalance: Infinity })),
      ...affiliates.map(a => ({ ...a, role: UserRole.AFFILIATE, currentBalance: calculatedBalances[a.id] ?? 0 })),
      ...managers.map(m => ({ ...m, role: UserRole.MANAGER, currentBalance: calculatedBalances[m.id] ?? 0 })),
      ...logistics.map(l => ({ id: l.id, name: l.name, email: l.email, role: UserRole.LOGISTICS, currentBalance: undefined })),
      ...customerCareUsers.map(c => ({ ...c, role: UserRole.CUSTOMER_CARE, currentBalance: calculatedBalances[c.id] ?? 0 })),
    ];
    return users;
  }, [admins, affiliates, managers, logistics, customerCareUsers, calculatedBalances]);

  const fullUserObject = useMemo(() => {
    if (!user) return null;
    return allUsersWithBalance.find(u => u.id === user.id) || null;
  }, [user, allUsersWithBalance]);


  const currentAffiliate = useMemo(() => {
    if (user?.role === UserRole.AFFILIATE) {
        return affiliates.find(a => a.id === user.id);
    }
    return undefined;
  }, [user, affiliates]);

  const assistanceNotificationCount = useMemo(() => {
    if (!user) return 0;

    if (user.role === UserRole.ADMIN) {
        return tickets.filter(t => t.status === 'Aperto').length;
    }

    if (user.role === UserRole.MANAGER) {
        const affiliateOpenTickets = tickets.filter(t => t.userRole === UserRole.AFFILIATE && t.status === 'Aperto').length;
        
        const ownTicketsWithNewReplies = tickets.filter(t => 
            t.userId === user.id &&
            t.status !== 'Chiuso' &&
            t.replies.length > 0 &&
            t.replies[t.replies.length - 1].userId !== user.id
        ).length;

        return affiliateOpenTickets + ownTicketsWithNewReplies;
    } 
    
    const userTickets = tickets.filter(t => t.userId === user.id);
    return userTickets.filter(t => {
        if (t.status === 'Chiuso' || t.replies.length === 0) {
            return false;
        }
        const lastReply = t.replies[t.replies.length - 1];
        return lastReply.userId !== user.id;
    }).length;
    
  }, [tickets, user]);

  const pendingPaymentsCount = useMemo(() => {
    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.MANAGER)) {
        return 0;
    }

    const allPending = transactions
        .filter(t => t.type === 'Payout' && t.status === 'Pending')
        .map(t => {
            const userRequesting = allUsersWithBalance.find(u => u.id === t.userId);
            return { ...t, userRole: userRequesting?.role };
        });

    if (user.role === UserRole.ADMIN) {
        return allPending.filter(t =>
            t.userRole === UserRole.AFFILIATE ||
            t.userRole === UserRole.MANAGER ||
            t.userRole === UserRole.CUSTOMER_CARE
        ).length;
    }

    if (user.role === UserRole.MANAGER) {
        return allPending.filter(t =>
            t.userRole === UserRole.AFFILIATE ||
            t.userRole === UserRole.CUSTOMER_CARE
        ).length;
    }

    return 0;
  }, [user, transactions, allUsersWithBalance]);

  const handleLogin = (loggedInUser: User) => {
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    const initialView = (loggedInUser.role === UserRole.CUSTOMER_CARE) ? 'dashboard' : 'dashboard';
    setView(initialView);
    localStorage.setItem('view', initialView);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('view');
    setUser(null);
  };

  const handleNavigate = (newView: View) => {
    localStorage.setItem('view', newView);
    setViewingProduct(null); 
    setViewingNotification(null);
    setViewingTicket(null);
    setView(newView);
  };
  
  const handleAddNiche = (niche: string) => {
    setNiches(prev => [...prev, niche]);
  };

  const handleDeleteNiche = (nicheToDelete: string) => {
    setNiches(prev => prev.filter(n => n !== nicheToDelete));
  };


  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsProductFormOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsProductFormOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if(window.confirm('Sei sicuro di voler eliminare questo prodotto?')) {
        await db.deleteProduct(productId);
        await fetchData();
    }
  };

  const handleSaveProduct = async (productData: Partial<Product> & { imageFile?: File | null, newImageFiles?: File[] }) => {
    let finalImageUrl = productData.imageUrl;
    const finalGalleryUrls = [...(productData.galleryImageUrls || [])];

    if (productData.imageFile) {
        const file = productData.imageFile;
        const filePath = `public/${Date.now()}-main-${file.name.replace(/\s/g, '_')}`;
        const { error: uploadError } = await db.supabase.storage.from('product-images').upload(filePath, file);

        if (uploadError) {
            console.error('Error uploading main image:', uploadError);
            alert(`Errore durante il caricamento dell'immagine principale: ${uploadError.message}`);
            throw uploadError;
        }

        const { data } = db.supabase.storage.from('product-images').getPublicUrl(filePath);
        if (!data.publicUrl) {
            const error = new Error("Could not get public URL for uploaded main image.");
            console.error(error);
            alert(error.message);
            throw error;
        }
        finalImageUrl = data.publicUrl;
    }

    if (productData.newImageFiles && productData.newImageFiles.length > 0) {
        const uploadPromises = productData.newImageFiles.map(file => {
            const filePath = `public/${Date.now()}-gallery-${file.name.replace(/\s/g, '_')}`;
            return db.supabase.storage.from('product-images').upload(filePath, file);
        });
        
        const uploadResults = await Promise.all(uploadPromises);

        for (const result of uploadResults) {
            if (result.error) {
                console.error('Error uploading gallery image:', result.error);
                alert(`Errore durante il caricamento di un'immagine della galleria: ${result.error.message}`);
                throw result.error;
            }
            if (result.data) {
                const { data: urlData } = db.supabase.storage.from('product-images').getPublicUrl(result.data.path);
                if (urlData.publicUrl) {
                    finalGalleryUrls.push(urlData.publicUrl);
                } else {
                    console.warn('Could not get public URL for a gallery image.');
                }
            }
        }
    }
    
    const { imageFile, newImageFiles, ...restOfProductData } = productData;
    const dataForDb: Partial<Product> = {
        ...restOfProductData,
        imageUrl: finalImageUrl,
        galleryImageUrls: finalGalleryUrls,
    };

    if (editingProduct) {
        if (editingProduct.isActive && dataForDb.isActive === false) {
            await handleCreateNotification({
                title: 'Prodotto in Pausa',
                message: `Il prodotto "${editingProduct.name}" è stato messo in pausa e non è temporaneamente disponibile per la vendita.`,
                targetRoles: [UserRole.AFFILIATE],
                eventType: 'product-deactivated',
                linkTo: `product-detail/${editingProduct.id}`,
            });
        }
        const { data: updatedProduct, error } = await db.updateProduct(editingProduct.id, dataForDb);
        if (error) {
            console.error('Error updating product:', error);
            alert(`Errore durante l'aggiornamento del prodotto: ${error.message}`);
            return;
        }
        await fetchData();
        if (view === 'product-detail' && updatedProduct) {
            setViewingProduct(updatedProduct);
        }
    } else {
        const newProductData = {
            id: `p${Date.now()}`,
            createdAt: new Date().toISOString(),
            freeShipping: true,
            ...dataForDb,
        } as Product;
        await db.addProduct(newProductData);
        await handleCreateNotification({
            title: 'Nuovo Prodotto Aggiunto',
            message: `È disponibile il prodotto: "${newProductData.name}". Commissione: €${newProductData.commissionValue?.toFixed(2)}.`,
            targetRoles: [UserRole.AFFILIATE],
            eventType: 'new-product',
            linkTo: `product-detail/${newProductData.id}`,
        });
        await fetchData();
    }
    
    setIsProductFormOpen(false);
    setEditingProduct(null);
};

  const handleViewProduct = (product: Product) => {
    setViewingProduct(product);
    setView('product-detail');
  }

  const handleAddAffiliate = () => {
    setEditingAffiliate(null);
    setIsAffiliateFormOpen(true);
  };

  const handleEditAffiliate = (affiliate: Affiliate) => {
    setEditingAffiliate(affiliate);
    setIsAffiliateFormOpen(true);
  };

  const handleDeleteAffiliate = async (affiliateId: string) => {
    if(window.confirm('Sei sicuro di voler eliminare questo affiliato?')) {
        await db.deleteAffiliate(affiliateId);
        await fetchData();
    }
  };
  
  const handleSaveAffiliate = async (affiliateData: Partial<Affiliate>) => {
    if (editingAffiliate) {
      await db.updateAffiliate(editingAffiliate.id, affiliateData);
    } else {
      const newId = generateId();
      const newAffiliate: Affiliate = {
        id: newId,
        totalSales: 0,
        totalCommissions: 0,
        currentBalance: 0,
        isBlocked: false,
        uniqueLink: `https://mws.com/ref/${newId}`,
        ...affiliateData
      } as Affiliate;
      await db.addAffiliate(newAffiliate);
    }
    await fetchData();
    setIsAffiliateFormOpen(false);
    setEditingAffiliate(null);
  };

  const handleAddManager = () => {
    setEditingManager(null);
    setIsManagerFormOpen(true);
  };

  const handleEditManager = (manager: Manager) => {
    setEditingManager(manager);
    setIsManagerFormOpen(true);
  };

  const handleDeleteManager = async (managerId: string) => {
    if(window.confirm('Sei sicuro di voler eliminare questo manager?')) {
        await db.deleteManager(managerId);
        await fetchData();
    }
  };

  const handleSaveManager = async (managerData: Partial<Manager>) => {
    if (editingManager) {
        await db.updateManager(editingManager.id, managerData);
    } else {
        const newManager: Manager = {
            id: generateId(),
            isBlocked: false,
            role: UserRole.MANAGER,
            currentBalance: 0,
            ...managerData
        } as Manager;
        await db.addManager(newManager);
    }
    await fetchData();
    setIsManagerFormOpen(false);
    setEditingManager(null);
  };

  const handleSaveSale = async (updatedSale: Sale) => {
    await db.updateSale(updatedSale.id, updatedSale);
    await fetchData();
    setViewingOrder(updatedSale);
  };

  const handleUpdateSaleStatus = async (saleId: string, status: SaleStatus) => {
    if (!user) return;
    const updates: Partial<Sale> = { 
        status, 
        statusUpdatedAt: new Date().toISOString(), 
    };
    // Only update lastContactedBy if user is not Logistics
    if (user.role !== UserRole.LOGISTICS) {
        updates.lastContactedBy = user.id;
        updates.lastContactedByName = user.name;
    }
    await db.updateSale(saleId, updates);
    await refreshData(); 
  };
  
    const handleAddStockExpense = async (expense: Omit<StockExpense, 'id' | 'createdAt' | 'totalCost'>) => {
        await db.addStockExpense(expense);
        await refreshData();
    };

    const handleDeleteStockExpense = async (expenseId: string) => {
        await db.deleteStockExpense(expenseId);
        await refreshData();
    };

    const handleUpdateStock = async (productId: string, updates: { stockQuantity: number } | { variantId: string, stockQuantity: number }) => {
        const productToUpdate = products.find(p => p.id === productId);
        if (!productToUpdate) {
            alert("Prodotto non trovato!");
            return;
        }

        let dbUpdate: Partial<Product>;

        if ('variantId' in updates) {
            // Update a variant
            const updatedVariants = productToUpdate.variants?.map(v => 
                v.id === updates.variantId ? { ...v, stockQuantity: updates.stockQuantity } : v
            );
            if (!updatedVariants) {
                alert("Variante non trovata!");
                return;
            }
            dbUpdate = { variants: updatedVariants };
        } else {
            // Update a simple product
            dbUpdate = { stockQuantity: updates.stockQuantity };
        }

        const { error } = await db.updateProduct(productId, dbUpdate);
        if (error) {
            console.error("Error updating stock:", error);
            alert(`Errore durante l'aggiornamento dello stock: ${error.message}`);
        } else {
            await refreshData(); // Re-fetch data to reflect changes
        }
    };


  const handlePayoutRequest = async (userId: string, amount: number, paymentMethod: 'PayPal' | 'Bonifico Bancario' | 'Worldfili', paymentDetails: string): Promise<{ success: boolean, error?: string }> => {
    const userToUpdate = allUsersWithBalance.find(u => u.id === userId && u.currentBalance !== undefined);
    if (!userToUpdate) return { success: false, error: 'Utente non trovato.' };

    const pendingPayouts = transactions
        .filter(t => t.userId === userId && t.type === 'Payout' && t.status === 'Pending')
        .reduce((sum, t) => sum + t.amount, 0);

    const availableForNewRequest = (userToUpdate.currentBalance || 0) - pendingPayouts;

    if (availableForNewRequest < amount) {
        return { success: false, error: 'Saldo insufficiente per questa richiesta, considerando i pagamenti già in sospeso.' };
    }

    const newTransaction: Transaction = {
      id: `T${Date.now()}`,
      userId,
      type: 'Payout',
      amount,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      paymentMethod,
      paymentDetails
    };

    await db.addTransaction(newTransaction);
    await fetchData();
    return { success: true };
  };

  const handleTransferFunds = async (fromUserId: string, toUserId: string, amount: number, notes?: string): Promise<{ success: boolean; error?: string }> => {
      const fromUser = allUsersWithBalance.find(u => u.id === fromUserId);
      const toUser = allUsersWithBalance.find(u => u.id === toUserId);

      if (!fromUser || !toUser) return { success: false, error: 'Utente non trovato.' };
      if (!('currentBalance' in fromUser) || fromUser.currentBalance === undefined || fromUser.currentBalance < amount) return { success: false, error: 'Saldo insufficiente.' };
      
      const newTransaction: Transaction = {
          id: `T${Date.now()}`,
          userId: fromUserId,
          type: 'Transfer',
          amount,
          status: 'Completed',
          createdAt: new Date().toISOString(),
          fromUserId, fromUserName: fromUser.name,
          toUserId, toUserName: toUser.name,
          notes: notes || undefined,
      };

      await db.addTransaction(newTransaction);
      await fetchData();
      return { success: true };
  };
  
    const handleAdminTransferFunds = async (fromUserId: string, toUserId: string, amount: number): Promise<{ success: boolean; error?: string }> => {
        const fromUser = allUsersWithBalance.find(u => u.id === fromUserId);
        const toUser = allUsersWithBalance.find(u => u.id === toUserId);
        
        if (!fromUser || !toUser) return { success: false, error: 'Utente non trovato.' };
        if ((fromUser.currentBalance || 0) < amount) return { success: false, error: 'Saldo del mittente insufficiente.' };
        
        const newTransaction: Transaction = {
            id: `T${Date.now()}`, userId: user!.id, type: 'Transfer', amount, status: 'Completed',
            createdAt: new Date().toISOString(), fromUserId, fromUserName: fromUser.name,
            toUserId, toUserName: toUser.name,
        };

        await db.addTransaction(newTransaction);
        await fetchData();
        return { success: true };
    };

    const handleAddBonus = async (recipientId: string, amount: number, notes: string): Promise<{ success: boolean; error?: string }> => {
        if (!user) return { success: false, error: 'Utente non autenticato.' };

        const actor = allUsersWithBalance.find(u => u.id === user.id);
        const recipient = allUsersWithBalance.find(u => u.id === recipientId);

        if (!actor || !recipient || recipient.currentBalance === undefined) {
            return { success: false, error: 'Utente non trovato o non valido.' };
        }

        if (actor.role === UserRole.MANAGER) {
            if ((actor.currentBalance || 0) < amount) {
                return { success: false, error: 'Saldo insufficiente per il bonus.' };
            }
        }
        
        const newSale: Sale = {
            id: `BNS-${Date.now()}`,
            productId: 'BONUS-MANUALE',
            productName: 'Bonus Manuale',
            affiliateId: recipient.id,
            affiliateName: recipient.name,
            saleAmount: 0,
            commissionAmount: amount,
            saleDate: new Date().toISOString(),
            customerEmail: recipient.email,
            status: 'Consegnato',
            isBonus: true,
            subId: 'manuale',
            notes: `Bonus aggiunto da ${actor.name}. ${notes || ''}`.trim(),
        };

        await db.supabase.from('sales').insert([newSale]);

        if (actor.role === UserRole.MANAGER) {
            const managerDebitSale: Sale = {
                id: `BNS-DEBIT-${Date.now()}`,
                productId: 'BONUS-DEBIT',
                productName: `Bonus erogato a ${recipient.name}`,
                affiliateId: actor.id,
                affiliateName: actor.name,
                saleAmount: 0,
                commissionAmount: -amount,
                saleDate: new Date().toISOString(),
                customerEmail: actor.email,
                status: 'Consegnato',
                isBonus: true,
                subId: 'manuale',
                notes: `Bonus per ${recipient.name}. ${notes || ''}`.trim(),
            };
            await db.supabase.from('sales').insert([managerDebitSale]);
        }

        await fetchData();
        return { success: true };
    };

  const handleApproveTransaction = async (transactionId: string) => {
    await db.updateTransaction(transactionId, { status: 'Completed' });
    await fetchData();
  };

  const handleRejectTransaction = async (transactionId: string) => {
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) return;
      
      await db.updateTransaction(transactionId, { status: 'Failed' });
      await fetchData();
  };

  const handleUpdateProfile = async (updatedData: Partial<User & { privacyPolicyUrl?: string }>) => {
    if (!user) return;
    await db.updateUserProfile(user.role, user.id, updatedData);
    setUser(prev => ({ ...prev!, name: updatedData.name!, email: updatedData.email! }));
    await fetchData();
    alert('Profilo aggiornato con successo!');
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
      if (!user) return false;
      let passwordMatch = false;
      let userObject: any = null;
      
      switch (user.role) {
          case UserRole.ADMIN: userObject = admins.find(a => a.id === user.id); break;
          case UserRole.AFFILIATE: userObject = affiliates.find(a => a.id === user.id); break;
          case UserRole.MANAGER: userObject = managers.find(m => m.id === user.id); break;
          case UserRole.LOGISTICS: userObject = logistics.find(l => l.id === user.id); break;
          case UserRole.CUSTOMER_CARE: userObject = customerCareUsers.find(c => c.id === user.id); break;
      }
      
      if (userObject && userObject.password === currentPassword) {
          await db.updateUserProfile(user.role, user.id, { password: newPassword });
          await fetchData();
          passwordMatch = true;
      }
      return passwordMatch;
  };

  const handleCreateNotification = async (notificationData: Omit<Notification, 'id' | 'createdAt' | 'readBy'>) => {
    const newNotification: Notification = {
      id: `n${Date.now()}`, createdAt: new Date().toISOString(), readBy: [], ...notificationData
    };
    await db.addNotification(newNotification);
    await fetchData();
  };
  
  const handleMarkNotificationAsRead = async (notificationId: string) => {
    if (!user) return;
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.readBy.includes(user.id)) {
      const newReadBy = [...notification.readBy, user.id];
      await db.updateNotification(notificationId, { readBy: newReadBy });
      await fetchData();
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    if (!user) return;
    const updates = notifications
      .filter(n => n.targetRoles.includes(user.role) && !n.readBy.includes(user.id))
      .map(n => db.updateNotification(n.id, { readBy: [...n.readBy, user.id] }));
    await Promise.all(updates);
    await fetchData();
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questa notifica?')) {
      await db.deleteNotification(notificationId);
      await fetchData();
    }
  };

  const handleViewNotification = (notification: Notification) => {
    handleMarkNotificationAsRead(notification.id);
    setViewingNotification(notification);
    setView('notification-detail');
  };

  const handleNavigateToLink = (link: string) => {
    const [view, id] = link.split('/');
    if (view === 'product-detail' && id) {
        const productToView = products.find(p => p.id === id);
        if (productToView) { handleViewProduct(productToView); }
        else { alert("Prodotto non trovato."); setView('products'); }
    }
  };
  
    const handleCreateTicket = async (ticketData: { subject: string, message: string }) => {
        if (!user) return;
        const newTicket: Ticket = {
            id: `TICKET${Date.now()}`, userId: user.id, userName: user.name, userRole: user.role,
            subject: ticketData.subject, message: ticketData.message, status: 'Aperto',
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), replies: [],
        };
        await db.addTicket(newTicket);
        await fetchData();
        setIsTicketFormOpen(false);
    };

    const handleViewTicket = (ticket: Ticket) => {
        setViewingTicket(ticket);
        setView('ticket-detail');
    };

    const handleAddTicketReply = async (ticketId: string, message: string) => {
        if (!user) return;
        const newReply: TicketReply = {
            id: `REPLY${Date.now()}`, ticketId: ticketId, userId: user.id, userName: user.name, message, createdAt: new Date().toISOString(),
        };
        await db.addTicketReply(newReply);
        const newStatus = (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) ? 'In Lavorazione' : tickets.find(t=>t.id===ticketId)!.status;
        await db.updateTicketStatus(ticketId, newStatus, new Date().toISOString());
        await fetchData();
        const updatedTicket = (await db.supabase.from('tickets').select('*, ticket_replies(*)').eq('id', ticketId).single()).data;
        if (updatedTicket) setViewingTicket({ ...updatedTicket, replies: updatedTicket.ticket_replies });
    };

    const handleUpdateTicketStatus = async (ticketId: string, status: TicketStatus) => {
        await db.updateTicketStatus(ticketId, status, new Date().toISOString());
        await fetchData();
        const updatedTicket = (await db.supabase.from('tickets').select('*, ticket_replies(*)').eq('id', ticketId).single()).data;
        if (updatedTicket) setViewingTicket({ ...updatedTicket, replies: updatedTicket.ticket_replies });
    };
    
    const handleSaveWhatsAppTemplate = async (template: string) => {
      await db.updateSetting('whatsapp_welcome_template', template);
      await refreshData();
      setIsWhatsAppTemplateModalOpen(false);
    };

    const handleContactUpdate = async (saleId: string, newStatus: SaleStatus, notes: string) => {
      if (!user) return;
      const updates = { status: newStatus, notes, statusUpdatedAt: new Date().toISOString(), lastContactedBy: user.id, lastContactedByName: user.name };
      await db.updateSale(saleId, updates);
      await fetchData();
      setContactingSale(null);
    };
    
    const handleLogSaleContact = async (saleId: string, historyItem: ContactHistoryItem) => {
        const sale = sales.find(s => s.id === saleId);
        if (!sale) return;
        
        const updatedHistory = [...(sale.contactHistory || []), historyItem];
        await db.updateSale(saleId, { contactHistory: updatedHistory });
        
        // Optimistically update local state
        setSales(prev => prev.map(s => s.id === saleId ? { ...s, contactHistory: updatedHistory } : s));
        setContactingSale(prev => prev ? { ...prev, contactHistory: updatedHistory } : null);
    };


    const handleUpdateSaleNotes = async (saleId: string, notes: string) => {
        if (!user) return;
        const updates = { notes, lastContactedBy: user.id, lastContactedByName: user.name };
        await db.updateSale(saleId, updates);
        await refreshData();
        setContactingSale(prev => prev ? {...prev, notes} : null);
    };

    const handleUpdateSaleAddress = async (saleId: string, addressParts: { street: string, houseNumber: string, city: string, province: string, zip: string }) => {
        if (!user) return;
        const updates = {
            customer_street_address: addressParts.street,
            customer_house_number: addressParts.houseNumber,
            customer_city: addressParts.city,
            customer_province: addressParts.province,
            customer_zip: addressParts.zip,
            lastContactedBy: user.id,
            lastContactedByName: user.name
        };
        await db.updateSale(saleId, updates);
        await refreshData();
        setContactingSale(prev => prev ? {
            ...prev,
            customer_street_address: addressParts.street,
            customer_house_number: addressParts.houseNumber,
            customer_city: addressParts.city,
            customer_province: addressParts.province,
            customer_zip: addressParts.zip,
        } : null);
    };

    const handleManageOrder = (sale: Sale) => {
      setManagingSale(sale);
    };

    const handleLogisticsSave = async (saleId: string, newStatus: SaleStatus, trackingCode: string, isBonus: boolean) => {
      const updates: Partial<Sale> = { 
        status: newStatus, 
        trackingCode: newStatus === 'Spedito' ? trackingCode : undefined, 
        statusUpdatedAt: new Date().toISOString(), 
        isBonus,
       };
      await db.updateSale(saleId, updates);
      await fetchData();
      setManagingSale(null);
    };

    const handleCreateShipment = async (shipmentDetails: any): Promise<{ success: boolean; error?: string; labelUrl?: string; }> => {
      if (!shippingSale || !platformSettings.paccofacile_api_key) {
        return { success: false, error: "Chiave API di PaccoFacile.it non configurata." };
      }
      
      const API_URL = 'https://www.paccofacile.it/api/v1/shipment/create';

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${platformSettings.paccofacile_api_key}`
          },
          body: JSON.stringify(shipmentDetails)
        });

        const data = await response.json();

        if (!response.ok || data.error) {
          console.error("PaccoFacile API Error:", data);
          return { success: false, error: data.error?.message || 'Errore API sconosciuto.' };
        }

        const trackingCode = data.tracking_code;
        const labelUrl = data.label;

        // Update the sale in our database
        await handleLogisticsSave(shippingSale.id, 'Spedito', trackingCode, shippingSale.isBonus || false);

        // Close modal will happen after showing success
        return { success: true, labelUrl };

      } catch (error) {
        console.error("Error creating shipment:", error);
        return { success: false, error: 'Errore di rete o di connessione con PaccoFacile.it.' };
      }
    };
    
    const handleSaveAppearanceSettings = async (settingsData: Partial<PlatformSettings> & { logoFile?: File | null }) => {
        const { logoFile, ...restSettings } = settingsData;
        let newLogoUrl: string | undefined = undefined;

        const updates: Partial<PlatformSettings> = { ...restSettings };

        if (logoFile) {
            const filePath = `public/platform-logo-${Date.now()}`;
            const { data, error: uploadError } = await db.supabase.storage.from('product-images').upload(filePath, logoFile);

            if (uploadError) {
                console.error('Error uploading logo:', uploadError);
                alert(`Errore durante il caricamento del logo: ${uploadError.message}`);
                return;
            }

            const { data: urlData } = db.supabase.storage.from('product-images').getPublicUrl(data.path);
            if (!urlData.publicUrl) {
                alert("Impossibile ottenere l'URL pubblico per il logo.");
                return;
            }
            newLogoUrl = urlData.publicUrl;
            updates.platform_logo = newLogoUrl;
        }

        const updatePromises = Object.entries(updates).map(([key, value]) => {
            if (value !== undefined) {
                return db.updateSetting(key, String(value));
            }
            return Promise.resolve();
        });

        await Promise.allSettled(updatePromises);
        
        setPlatformSettings(prevSettings => ({ ...prevSettings, ...updates }));
        
        alert('Impostazioni di aspetto salvate!');
    };
    
    const handleSaveIntegrationsSettings = async (settingsData: Partial<PlatformSettings>) => {
        const updatePromises = Object.entries(settingsData).map(([key, value]) => {
            if (value !== undefined) {
                return db.updateSetting(key, String(value));
            }
            return Promise.resolve();
        });

        await Promise.allSettled(updatePromises);
        
        setPlatformSettings(prevSettings => ({ ...prevSettings, ...settingsData, }));
        
        alert('Impostazioni Integrazioni salvate!');
    };
    
    const handleSaveIpBlocklist = async (ips: string[]) => {
        await db.updateSetting('blocked_ips', JSON.stringify(ips));
        setPlatformSettings(prev => ({ ...prev, blocked_ips: ips }));
        alert('Lista IP bloccati aggiornata!');
    };


  const userNotifications = useMemo(() => {
    if (!user) return [];
    return notifications
        .filter(n => n.targetRoles.includes(user.role))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notifications, user]);


  const visibleProducts = useMemo(() => {
    if (!user) return [];
    if (user.role === UserRole.AFFILIATE) {
      return products.filter(p => p.isActive && (p.allowedAffiliateIds === null || p.allowedAffiliateIds.includes(user.id)));
    }
    return products;
  }, [products, user]);

  const renderContent = () => {
    if (loading && !user) return null; // Prevent rendering content before user is checked and data is loaded
    if (loading) {
        return <div className="flex justify-center items-center h-screen"><p>Caricamento dati...</p></div>;
    }
    if (view === 'notification-detail' && viewingNotification) {
      return <NotificationDetailView notification={viewingNotification} onBack={() => setView('dashboard')} onNavigateToLink={handleNavigateToLink} />;
    }
    if (view === 'product-detail' && viewingProduct) {
        return <ProductDetail product={viewingProduct} userRole={user!.role} affiliates={affiliates} sales={allVisibleSales} currentAffiliate={currentAffiliate} onBack={() => setView('products')} onEdit={handleEditProduct} platformSettings={platformSettings} />;
    }
     if (view === 'ticket-detail' && viewingTicket) {
        return <TicketDetailView user={user!} ticket={viewingTicket} onAddReply={handleAddTicketReply} onUpdateStatus={handleUpdateTicketStatus} onBack={() => setView('assistenza')} />;
    }
    switch (view) {
      case 'dashboard': return <Dashboard user={user!} products={products} affiliates={affiliates} sales={processedSales} />;
      case 'performance': return <Performance user={user!} sales={processedSales} products={visibleProducts} affiliates={affiliates} stockExpenses={stockExpenses} onRefreshData={refreshData} />;
      case 'products': return <ProductList products={visibleProducts} userRole={user!.role} niches={niches} onAddProduct={handleAddProduct} onEditProduct={handleEditProduct} onDeleteProduct={handleDeleteProduct} onViewProduct={handleViewProduct} onOpenNicheManager={() => setIsNicheModalOpen(true)} />;
      case 'affiliates': return <AffiliateManager affiliates={affiliates} onAddAffiliate={handleAddAffiliate} onEditAffiliate={handleEditAffiliate} onDeleteAffiliate={handleDeleteAffiliate} />;
      case 'managers': if (user?.role === UserRole.ADMIN) { return <ManagerList managers={managers} onAddManager={handleAddManager} onEditManager={handleEditManager} onDeleteManager={handleDeleteManager} />; } return null;
      case 'orders': return <OrderList user={user!} sales={allVisibleSales} affiliates={affiliates} onViewOrder={setViewingOrder} onContactCustomer={setContactingSale} onManageOrder={handleManageOrder} onOpenWhatsAppTemplateEditor={() => setIsWhatsAppTemplateModalOpen(true)} onRefreshData={refreshData} onShipOrder={setShippingSale} onUpdateSaleStatus={handleUpdateSaleStatus} onUpdateSale={handleSaveSale} />;
      case 'pagamenti': if (!fullUserObject) return null; return <PaymentsPage user={user!} fullUserObject={fullUserObject as (Affiliate | Manager | CustomerCareUser | User)} allUsersWithBalance={allUsersWithBalance} transactions={transactions} sales={sales} onPayoutRequest={handlePayoutRequest} onTransferFunds={handleTransferFunds} onAdminTransferFunds={handleAdminTransferFunds} onApproveTransaction={handleApproveTransaction} onRejectTransaction={handleRejectTransaction} onAddBonus={handleAddBonus} />;
      case 'notifications':
        if (user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER) {
            return <NotificationManager notifications={notifications} allUsers={allUsersWithBalance} onCreateNotification={handleCreateNotification} onDeleteNotification={handleDeleteNotification} />;
        }
        if (user?.role === UserRole.AFFILIATE || user?.role === UserRole.LOGISTICS || user?.role === UserRole.CUSTOMER_CARE) {
            return <NotificationListView user={user} notifications={userNotifications} onViewNotification={handleViewNotification} />;
        }
        return null;
      case 'profile': if (!fullUserObject) return null; return <ProfilePage user={user!} fullUserObject={fullUserObject} onUpdateProfile={handleUpdateProfile} onChangePassword={handleChangePassword} />;
      case 'assistenza': return <AssistancePage user={user!} tickets={tickets} onOpenNewTicket={() => setIsTicketFormOpen(true)} onViewTicket={handleViewTicket} />;
      case 'settings': if(user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER) { return <SettingsPage user={user} settings={platformSettings} products={products} onSaveAppearance={handleSaveAppearanceSettings} onSaveIntegrations={handleSaveIntegrationsSettings} onSaveIpBlocklist={handleSaveIpBlocklist} /> } return null;
      case 'contabilita': if(user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER) { return <AccountingPage products={products} sales={sales} stockExpenses={stockExpenses} transactions={transactions} onAddExpense={handleAddStockExpense} onDeleteExpense={handleDeleteStockExpense} />; } return null;
      case 'magazzino': if([UserRole.ADMIN, UserRole.MANAGER, UserRole.LOGISTICS].includes(user!.role)) { return <InventoryPage products={products} onUpdateStock={handleUpdateStock} />; } return null;
      default: return null;
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} platformSettings={platformSettings} />;
  }
  
  const shippingProduct = products.find(p => p.id === shippingSale?.productId);

  return (
    <div className="bg-background min-h-screen">
      <Sidebar 
        user={user} 
        onNavigate={handleNavigate} 
        onLogout={handleLogout} 
        currentView={view} 
        assistanceNotificationCount={assistanceNotificationCount}
        pendingPaymentsCount={pendingPaymentsCount}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        platformSettings={platformSettings}
      />
      <main className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <Header
          user={user}
          fullUserObject={fullUserObject}
          sales={processedSales}
          products={products}
          notifications={userNotifications}
          onOpenCommissionDetails={() => setIsCommissionDetailsModalOpen(true)}
          onMarkAsRead={handleMarkNotificationAsRead}
          // FIX: Corrected typo from handleMarkAllAsRead to handleMarkAllNotificationsAsRead.
          onMarkAllAsRead={handleMarkAllNotificationsAsRead}
          onViewNotification={handleViewNotification}
          onOpenPlatformCheck={() => setIsPlatformCheckModalOpen(true)}
        />
        {renderContent()}
      </main>
      
      {user.role === UserRole.AFFILIATE && <NotificationPopupHost user={user} notifications={userNotifications} onViewNotification={handleViewNotification} />}

      <Modal isOpen={isProductFormOpen} onClose={() => setIsProductFormOpen(false)} title={editingProduct ? 'Modifica Prodotto' : 'Nuovo Prodotto'}>
        <ProductForm product={editingProduct} affiliates={affiliates} niches={niches} onSave={handleSaveProduct} onClose={() => setIsProductFormOpen(false)} />
      </Modal>

      <Modal isOpen={isAffiliateFormOpen} onClose={() => setIsAffiliateFormOpen(false)} title={editingAffiliate ? 'Modifica Affiliato' : 'Nuovo Affiliato'}>
        <AffiliateForm affiliate={editingAffiliate} onSave={handleSaveAffiliate} onClose={() => setIsAffiliateFormOpen(false)} />
      </Modal>

       <Modal isOpen={isManagerFormOpen} onClose={() => setIsManagerFormOpen(false)} title={editingManager ? 'Modifica Manager' : 'Nuovo Manager'}>
        <ManagerForm manager={editingManager} onSave={handleSaveManager} onClose={() => setIsManagerFormOpen(false)} />
      </Modal>
      
      <Modal isOpen={isTicketFormOpen} onClose={() => setIsTicketFormOpen(false)} title="Apri un Nuovo Ticket">
        <TicketForm onCreate={handleCreateTicket} onClose={() => setIsTicketFormOpen(false)} />
      </Modal>

      <Modal isOpen={isNicheModalOpen} onClose={() => setIsNicheModalOpen(false)} title="Gestione Nicchie Prodotti">
        <NicheManager niches={niches} products={products} onAddNiche={handleAddNiche} onDeleteNiche={handleDeleteNiche} />
      </Modal>

      <Modal isOpen={!!viewingOrder} onClose={() => setViewingOrder(null)} title={`Dettaglio Ordine #${viewingOrder?.id}`} size="5xl">
        {viewingOrder && <OrderDetail sale={viewingOrder} user={user} products={products} onSave={handleSaveSale} />}
      </Modal>

      <Modal isOpen={!!contactingSale} onClose={() => setContactingSale(null)} title={`Contatta Cliente: ${contactingSale?.customerName}`}>
        {contactingSale && (
          <CustomerContactModal 
            sale={contactingSale} 
            template={whatsAppMessageTemplate} 
            user={user} 
            products={products} 
            onUpdate={handleContactUpdate} 
            onClose={() => setContactingSale(null)}
            onUpdateAddress={handleUpdateSaleAddress}
            // FIX: Corrected typo from handleUpdateNotes to handleUpdateSaleNotes
            onUpdateNotes={handleUpdateSaleNotes}
            onLogContact={handleLogSaleContact}
        />)}
      </Modal>

       <Modal isOpen={!!managingSale} onClose={() => setManagingSale(null)} title={`Gestisci Ordine #${managingSale?.id}`}>
        {managingSale && (<LogisticsOrderModal sale={managingSale} onSave={handleLogisticsSave} onClose={() => setManagingSale(null)} />)}
      </Modal>
      
      <Modal isOpen={!!shippingSale} onClose={() => setShippingSale(null)} title={`Crea Spedizione per Ordine #${shippingSale?.id}`}>
        {shippingSale && shippingProduct && (
            <PaccoFacileModal 
                sale={shippingSale} 
                product={shippingProduct}
                settings={platformSettings}
                onClose={() => setShippingSale(null)}
                onCreateShipment={handleCreateShipment}
            />
        )}
      </Modal>

      <Modal isOpen={isWhatsAppTemplateModalOpen} onClose={() => setIsWhatsAppTemplateModalOpen(false)} title="Modifica Messaggio di Benvenuto WhatsApp">
        <WhatsAppTemplateModal template={whatsAppMessageTemplate} onSave={handleSaveWhatsAppTemplate} onClose={() => setIsWhatsAppTemplateModalOpen(false)} />
      </Modal>
      
      <Modal 
        isOpen={isCommissionDetailsModalOpen} 
        onClose={() => setIsCommissionDetailsModalOpen(false)} 
        title="Dettaglio Commissioni per Stato"
      >
        <HeaderCommissionModal sales={processedSales} user={user} products={products} />
      </Modal>

      <Modal 
        isOpen={isPlatformCheckModalOpen}
        onClose={() => setIsPlatformCheckModalOpen(false)}
        title="Controllo Integrità Piattaforma"
      >
        <PlatformCheckModal
            user={user}
            sales={allVisibleSales}
            settings={platformSettings}
            onClose={() => setIsPlatformCheckModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

export default App;
