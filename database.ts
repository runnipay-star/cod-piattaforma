import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Product, Affiliate, Manager, LogisticsUser, CustomerCareUser, Sale, Notification, Ticket, TicketReply, Transaction, User, UserRole, TicketStatus, Admin, PlatformSettings, StockExpense } from './types';

// IMPORTANT: Move these to environment variables in a real application
const supabaseUrl = 'https://qscuniyfebjfbebrkakm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzY3VuaXlmZWJqZmJlYnJrYWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MDExNjksImV4cCI6MjA3NjE3NzE2OX0.vTEeY69AhxzN5t7wGZrmac8YqXQaM5OJ432BhDDAhyY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- General Fetch ---
export const fetchAllInitialData = async () => {
    const [
        { data: products },
        { data: admins },
        { data: affiliates },
        { data: managers },
        { data: logisticsUsers },
        { data: customerCareUsers },
        { data: sales },
        { data: notifications },
        { data: ticketsData },
        { data: transactions },
        { data: stockExpenses }
    ] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('admins').select('*'),
        supabase.from('affiliates').select('*'),
        supabase.from('managers').select('*'),
        supabase.from('logistics_users').select('*'),
        supabase.from('customer_care_users').select('*'),
        supabase.from('sales').select('*'),
        supabase.from('notifications').select('*'),
        supabase.from('tickets').select('*, ticket_replies(*)'),
        supabase.from('transactions').select('*'),
        supabase.from('stock_expenses').select('*')
    ]);

    const tickets = ticketsData?.map(t => ({ ...t, replies: t.ticket_replies })) || [];

    return { products, admins, affiliates, managers, logisticsUsers, customerCareUsers, sales, notifications, tickets, transactions, stockExpenses };
};

// --- Settings ---
export const getSettings = async (): Promise<PlatformSettings> => {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) {
        console.error("Error fetching settings:", error);
        return {};
    }
    const settings: PlatformSettings = {};
    data?.forEach(setting => {
        if (setting.key === 'blocked_ips') {
            try {
                settings.blocked_ips = JSON.parse(setting.value);
            } catch (e) {
                console.error("Error parsing blocked_ips:", e);
                settings.blocked_ips = [];
            }
        } else {
            settings[setting.key as keyof PlatformSettings] = setting.value;
        }
    });
    return settings;
};

export const updateSetting = (key: string, value: string) => {
    return supabase.from('settings').upsert({ key, value });
};

// --- Products ---
export const addProduct = (product: Partial<Product>) => supabase.from('products').insert([product]);
export const updateProduct = (id: string, updates: Partial<Product>) => supabase.from('products').update(updates).eq('id', id).select().single();
export const deleteProduct = (id: string) => supabase.from('products').delete().eq('id', id);

// --- Stock Expenses ---
export const addStockExpense = (expense: Partial<StockExpense>) => {
    const { productId, unitCost, ...rest } = expense;
    // Remap keys to match the case-sensitive column names in the database
    const dbExpense = {
        ...rest,
        "productId": productId,
        "unitCost": unitCost,
    };
    return supabase.from('stock_expenses').insert([dbExpense]);
};
export const deleteStockExpense = (id: string) => supabase.from('stock_expenses').delete().eq('id', id);

// --- Affiliates ---
export const addAffiliate = (affiliate: Partial<Affiliate>) => supabase.from('affiliates').insert([affiliate]);
export const updateAffiliate = (id: string, updates: Partial<Affiliate>) => supabase.from('affiliates').update(updates).eq('id', id);
export const deleteAffiliate = (id: string) => supabase.from('affiliates').delete().eq('id', id);

// --- Managers ---
export const addManager = (manager: Partial<Manager>) => supabase.from('managers').insert([manager]);
export const updateManager = (id: string, updates: Partial<Manager>) => supabase.from('managers').update(updates).eq('id', id);
export const deleteManager = (id: string) => supabase.from('managers').delete().eq('id', id);

// --- Sales ---
export const updateSale = (id: string, updates: Partial<Sale>) => supabase.from('sales').update(updates).eq('id', id);

// --- Notifications ---
export const addNotification = (notification: Partial<Notification>) => supabase.from('notifications').insert([notification]);
export const deleteNotification = (id: string) => supabase.from('notifications').delete().eq('id', id);
export const updateNotification = (id: string, updates: Partial<Notification>) => supabase.from('notifications').update(updates).eq('id', id);

// --- Tickets ---
export const addTicket = async (ticket: Partial<Ticket>) => {
    // Supabase doesn't handle nested inserts on create, so we insert ticket first.
    const { replies, ...ticketData } = ticket;
    return supabase.from('tickets').insert([ticketData]);
};
export const addTicketReply = (reply: Partial<TicketReply>) => supabase.from('ticket_replies').insert([{...reply, ticketId: reply.ticketId}]);
export const updateTicketStatus = (id: string, status: TicketStatus, updatedAt: string) => supabase.from('tickets').update({ status, updatedAt: updatedAt }).eq('id', id);

// --- Transactions ---
export const addTransaction = (transaction: Partial<Transaction>) => supabase.from('transactions').insert([transaction]);
export const updateTransaction = (id: string, updates: Partial<Transaction>) => supabase.from('transactions').update(updates).eq('id', id);

// --- User Profile/Security ---
// FIX: Changed the 'updates' parameter type from 'Partial<User>' to a more flexible '{ [key: string]: any }' to accommodate role-specific properties not present in the base User type, resolving the type error in App.tsx.
export const updateUserProfile = (role: UserRole, id: string, updates: { [key: string]: any }) => {
    const tables: { [key in UserRole]?: string } = {
        [UserRole.ADMIN]: 'admins',
        [UserRole.AFFILIATE]: 'affiliates',
        [UserRole.MANAGER]: 'managers',
        [UserRole.LOGISTICS]: 'logistics_users',
        [UserRole.CUSTOMER_CARE]: 'customer_care_users',
    };
    const table = tables[role];
    if (table) {
        return supabase.from(table).update(updates).eq('id', id);
    }
    return Promise.reject("Invalid role for profile update");
};