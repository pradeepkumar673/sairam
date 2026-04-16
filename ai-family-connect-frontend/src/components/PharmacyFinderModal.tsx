import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, Phone, Search, X, Crosshair, Loader2 } from 'lucide-react';
import api from '../lib/api';

interface PharmacyFinderModalProps {
  medicineName: string;
  onClose: () => void;
}

export default function PharmacyFinderModal({ medicineName, onClose }: PharmacyFinderModalProps) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);

  const fetchPharmacies = async (lat?: number, lon?: number, addr?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/medicine/pharmacies', { lat, lon, address: addr });
      setPharmacies(res.data.data.pharmacies || []);
      setSearched(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not find pharmacies automatically. Try entering an address manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseLocation = () => {
    setLoading(true);
    setError(null);
    if (!navigator.geolocation) {
      setLoading(false);
      setError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchPharmacies(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        setLoading(false);
        setError('Location access denied. Please enter your address manually.');
      },
      { timeout: 10000 }
    );
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    fetchPharmacies(undefined, undefined, address);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-lg rounded-[36px] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
      >
        <div className="bg-emerald-500 p-6 text-white relative shrink-0">
          <button onClick={onClose} className="absolute right-6 top-6 w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md mb-4 shadow-sm border border-white/20">
             <MapPin className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-[28px] font-bold leading-tight mb-2">Find Pharmacy</h2>
          <p className="text-emerald-50 font-medium text-[15px]">Find near you to restock <span className="font-bold text-white underline decoration-emerald-300">{medicineName}</span></p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto bg-warm-50/30">
          {!searched && (
            <div className="space-y-6">
               <button
                 onClick={handleUseLocation}
                 disabled={loading}
                 className="w-full flex items-center justify-center gap-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all outline-none"
               >
                 {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Crosshair className="w-6 h-6" />}
                 {loading ? 'Locating...' : 'Use My Current Location'}
               </button>

               <div className="relative flex items-center py-2">
                 <div className="flex-grow border-t border-warm-200"></div>
                 <span className="flex-shrink-0 mx-4 text-warm-400 font-bold text-sm">OR</span>
                 <div className="flex-grow border-t border-warm-200"></div>
               </div>

               <form onSubmit={handleManualSearch} className="space-y-3">
                 <label className="block font-bold text-gray-700 ml-1">Search Manually</label>
                 <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                     <Search className="text-gray-400 w-5 h-5" />
                   </div>
                   <input
                     type="text"
                     placeholder="Enter city or zip code..."
                     value={address}
                     onChange={(e) => setAddress(e.target.value)}
                     className="w-full bg-white border-2 border-warm-100 rounded-2xl py-4 pl-12 pr-4 text-gray-800 font-medium focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all text-lg"
                   />
                 </div>
                 <button
                   type="submit"
                   disabled={loading || !address.trim()}
                   className="w-full bg-warm-200 hover:bg-warm-300 text-warm-800 font-bold py-4 rounded-2xl shadow-sm transition-colors disabled:opacity-50"
                 >
                   {loading ? 'Searching...' : 'Search Location'}
                 </button>
               </form>

               <AnimatePresence>
                 {error && (
                   <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-sm font-medium border border-rose-100">
                     {error}
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>
          )}

          {searched && (
            <div className="space-y-4">
              <div className="flex justify-between items-end mb-4 px-1">
                 <h3 className="font-bold text-gray-900 text-lg">Results found ({pharmacies.length})</h3>
                 <button onClick={() => { setSearched(false); setPharmacies([]); }} className="text-indigo-600 font-bold text-sm hover:underline">
                   Search again
                 </button>
              </div>

              {pharmacies.length === 0 ? (
                <div className="bg-white p-8 rounded-3xl text-center border border-warm-100 shadow-sm">
                  <div className="w-16 h-16 bg-warm-100 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Search className="w-8 h-8 text-warm-400" />
                  </div>
                  <p className="text-gray-600 font-medium">No pharmacies found nearby. Try expanding your search area.</p>
                </div>
              ) : (
                pharmacies.map((pharmacy) => (
                  <div key={pharmacy.id} className="bg-white rounded-[24px] p-5 shadow-sm border border-warm-100/50 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg leading-tight mb-1">{pharmacy.name}</h4>
                        <p className="text-gray-500 text-sm font-medium leading-snug pr-4">{pharmacy.address}</p>
                      </div>
                      <div className="bg-emerald-50 text-emerald-700 font-bold text-sm px-3 py-1.5 rounded-xl shrink-0 border border-emerald-100">
                         {pharmacy.distanceKm} km
                      </div>
                    </div>
                    
                    <div className="flex gap-3 mt-5">
                      <a 
                        href={`tel:${pharmacy.phone.replace(/[^0-9+]/g, '')}`} 
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-3.5 rounded-[16px] font-bold transition-colors active:scale-95"
                      >
                         <Phone className="w-5 h-5" /> Call
                      </a>
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${pharmacy.lat},${pharmacy.lon}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-3.5 rounded-[16px] font-bold transition-colors active:scale-95"
                      >
                         <Navigation className="w-5 h-5" /> Directions
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
