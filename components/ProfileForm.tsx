import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { ClipboardIcon } from './icons/ClipboardIcon';

interface ProfileFormProps {
    user: User;
    onSave: (updatedData: Partial<User & { privacyPolicyUrl?: string }>) => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ user, onSave }) => {
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setName(user.name);
        setEmail(user.email);
        if ('privacyPolicyUrl' in user) {
            setPrivacyPolicyUrl((user as any).privacyPolicyUrl || '');
        }
    }, [user]);

    const handleCopyId = () => {
        navigator.clipboard.writeText(user.id).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const updatedData: Partial<User & { privacyPolicyUrl?: string }> = {
            id: user.id,
            name,
            email,
        };
        if (user.role === UserRole.AFFILIATE) {
            updatedData.privacyPolicyUrl = privacyPolicyUrl;
        }
        onSave(updatedData);
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="profileId" className="block text-sm font-medium text-gray-700">Il Tuo ID Utente</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                    <input 
                        type="text" 
                        id="profileId" 
                        value={user.id} 
                        readOnly 
                        className="block w-full flex-1 rounded-none rounded-l-md border-gray-300 bg-gray-100 px-3 py-2 focus:border-primary focus:ring-primary sm:text-sm"
                    />
                    <button 
                        type="button" 
                        onClick={handleCopyId}
                        className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                        <ClipboardIcon className="h-5 w-5 text-gray-400" />
                        <span className="w-16 text-left">{copied ? 'Copiato!' : 'Copia'}</span>
                    </button>
                </div>
            </div>

            <div>
                <label htmlFor="profileName" className="block text-sm font-medium text-gray-700">Nome</label>
                <input type="text" id="profileName" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
            </div>
            <div>
                <label htmlFor="profileEmail" className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" id="profileEmail" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
            </div>

            {user.role === UserRole.AFFILIATE && (
                 <div>
                    <label htmlFor="profilePrivacyUrl" className="block text-sm font-medium text-gray-700">URL Privacy Policy (Opzionale)</label>
                    <input type="url" id="profilePrivacyUrl" value={privacyPolicyUrl} onChange={(e) => setPrivacyPolicyUrl(e.target.value)} placeholder="https://tuosito.com/privacy" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                    <p className="mt-1 text-xs text-gray-500">Verrà usato per pre-compilare il form HTML.</p>
                </div>
            )}
            
            <div className="flex justify-end">
                <button type="submit" className="bg-primary text-on-primary font-bold py-2 px-6 rounded-lg hover:bg-primary-dark transition-colors duration-200">
                    Salva Modifiche
                </button>
            </div>
        </form>
    );
};

export default ProfileForm;
