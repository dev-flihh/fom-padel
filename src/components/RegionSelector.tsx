import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, ChevronLeft, X, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PROVINCES, CITIES, Province, City } from '../constants/regions';
import { cn } from '../lib/utils';

interface RegionSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (region: string) => void;
  currentValue?: string;
}

export const RegionSelector: React.FC<RegionSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentValue
}) => {
  const [step, setStep] = useState<'province' | 'city'>('province');
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProvinces = useMemo(() => {
    return PROVINCES.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [searchQuery]);

  const filteredCities = useMemo(() => {
    if (!selectedProvince) return [];
    return CITIES.filter(c => 
      c.provinceId === selectedProvince.id &&
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedProvince, searchQuery]);

  const handleProvinceSelect = (province: Province) => {
    setSelectedProvince(province);
    setStep('city');
    setSearchQuery('');
  };

  const handleCitySelect = (city: City) => {
    onSelect(`${city.name}, ${selectedProvince?.name}`);
    onClose();
    // Reset for next time
    setTimeout(() => {
      setStep('province');
      setSelectedProvince(null);
      setSearchQuery('');
    }, 300);
  };

  const handleBack = () => {
    setStep('province');
    setSelectedProvince(null);
    setSearchQuery('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="relative w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
          >
            <header className="px-6 pt-6 pb-4 border-b border-ios-gray/10">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  {step === 'city' && (
                    <button onClick={handleBack} className="p-2 -ml-2 tap-target">
                      <ChevronLeft size={20} />
                    </button>
                  )}
                  <h3 className="text-xl font-display font-bold">
                    {step === 'province' ? 'Pilih Provinsi' : selectedProvince?.name}
                  </h3>
                </div>
                <button onClick={onClose} className="p-2 bg-ios-gray/5 rounded-full tap-target">
                  <X size={20} />
                </button>
              </div>
              
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ios-gray" size={18} />
                <input 
                  type="text"
                  placeholder={step === 'province' ? "Cari Provinsi..." : "Cari Kota/Kabupaten..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-ios-gray/5 border border-ios-gray/10 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
              {step === 'province' ? (
                <div className="grid grid-cols-1 gap-1">
                  {filteredProvinces.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleProvinceSelect(p)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-ios-gray/5 tap-target transition-colors group"
                    >
                      <span className="font-bold text-on-surface">{p.name}</span>
                      <ChevronRight size={18} className="text-ios-gray group-hover:text-primary transition-colors" />
                    </button>
                  ))}
                  {filteredProvinces.length === 0 && (
                    <div className="py-12 text-center">
                      <MapPin size={40} className="mx-auto text-ios-gray/20 mb-2" />
                      <p className="text-ios-gray font-bold">Provinsi tidak ditemukan</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1">
                  {filteredCities.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleCitySelect(c)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-ios-gray/5 tap-target transition-colors group"
                    >
                      <span className="font-bold text-on-surface">{c.name}</span>
                      <div className="w-6 h-6 rounded-full border border-ios-gray/20 flex items-center justify-center group-hover:border-primary group-hover:bg-primary/5 transition-all">
                        <div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-primary" />
                      </div>
                    </button>
                  ))}
                  {filteredCities.length === 0 && (
                    <div className="py-12 text-center">
                      <MapPin size={40} className="mx-auto text-ios-gray/20 mb-2" />
                      <p className="text-ios-gray font-bold">Kota tidak ditemukan di provinsi ini</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-6 bg-ios-gray/5 border-t border-ios-gray/10">
              <p className="text-[10px] text-ios-gray font-bold text-center uppercase tracking-widest">
                {step === 'province' ? 'Pilih provinsi asal Anda' : 'Pilih kota/kabupaten spesifik'}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
