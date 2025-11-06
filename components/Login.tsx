import React, { useState } from 'react';
import { User, PlatformSettings } from '../types';
import { supabase } from '../database';
import { EyeIcon } from './icons/EyeIcon';
import { EyeSlashIcon } from './icons/EyeSlashIcon';

interface LoginProps {
  onLogin: (user: User) => void;
  platformSettings: PlatformSettings;
}

const Login: React.FC<LoginProps> = ({ onLogin, platformSettings }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const tables = ['admins', 'managers', 'affiliates', 'logistics_users', 'customer_care_users'];
      let loggedIn = false;

      for (const table of tables) {
        const { data: users, error: dbError } = await supabase
          .from(table)
          .select('*')
          .eq('email', email);

        if (dbError) {
          console.error(`Error fetching from ${table}:`, dbError);
          continue;
        }

        if (users && users.length > 0) {
          const userRecord = users[0];
          if (userRecord.password === password) {
            if (userRecord.isBlocked) {
              setError('Il tuo account è stato temporaneamente bloccato. Contatta l\'assistenza.');
            } else {
              onLogin({ id: userRecord.id, name: userRecord.name, email: userRecord.email, role: userRecord.role });
            }
            loggedIn = true;
            break;
          }
        }
      }

      if (!loggedIn) {
        setError('Credenziali non valide. Riprova.');
      }
    } catch (err) {
      console.error("Login error:", err);
      setError('Si è verificato un errore durante il login.');
    } finally {
      setLoading(false);
    }
  };
  
  const logoStyle = {
      width: `${platformSettings.logo_login_width || 128}px`,
      height: `${platformSettings.logo_login_height || 128}px`,
      objectFit: 'contain' as const,
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full bg-surface p-8 rounded-xl shadow-lg">
        <div className="text-center mb-8">
            <div className="flex flex-col items-center justify-center gap-4 mb-2">
                <h1 className="text-4xl font-bold text-secondary">MWS</h1>
                {platformSettings.platform_logo && (
                    <img 
                        src={platformSettings.platform_logo} 
                        alt="Logo Piattaforma" 
                        style={logoStyle}
                    />
                )}
            </div>
            <h2 className="text-2xl font-bold text-primary mt-2">Piattaforma Affiliati</h2>
            <p className="text-gray-500 mt-2">Accedi al tuo account</p>
        </div>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 top-1 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? "Nascondi password" : "Mostra password"}
              >
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-on-primary font-bold py-3 px-4 rounded-lg hover:bg-primary-dark transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400"
          >
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
