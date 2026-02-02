'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { MapPin, Hotel, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function HotelAutocomplete({
  value = '',
  onChange,
  onSelect,
  placeholder = "Rechercher un hôtel...",
  className,
  inputClassName,
  disabled = false,
}) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const autocompleteService = useRef(null);
  const placesService = useRef(null);
  const sessionToken = useRef(null);

  const debouncedInput = useDebounce(inputValue, 300);

  // Initialize Google Places services
  useEffect(() => {
    const initGooglePlaces = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        // Create a dummy div for PlacesService (required)
        const dummyDiv = document.createElement('div');
        placesService.current = new window.google.maps.places.PlacesService(dummyDiv);
        sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
      }
    };

    if (window.google) {
      initGooglePlaces();
    } else {
      // Load Google Maps script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&language=fr`;
      script.async = true;
      script.defer = true;
      script.onload = initGooglePlaces;
      document.head.appendChild(script);
    }
  }, []);

  // Fetch suggestions when input changes
  useEffect(() => {
    if (!debouncedInput || debouncedInput.length < 2 || !autocompleteService.current) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    autocompleteService.current.getPlacePredictions(
      {
        input: debouncedInput,
        types: ['lodging'], // Only hotels/lodging
        sessionToken: sessionToken.current,
      },
      (predictions, status) => {
        setIsLoading(false);
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
        }
      }
    );
  }, [debouncedInput]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update internal value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedIndex(-1);
    if (onChange) {
      onChange(newValue);
    }
  };

  const handleSelectSuggestion = useCallback((suggestion) => {
    if (!placesService.current) return;

    // Get place details
    placesService.current.getDetails(
      {
        placeId: suggestion.place_id,
        fields: ['name', 'formatted_address', 'address_components', 'geometry', 'place_id'],
        sessionToken: sessionToken.current,
      },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          // Extract city from address components
          let city = '';
          let country = '';
          if (place.address_components) {
            for (const component of place.address_components) {
              if (component.types.includes('locality')) {
                city = component.long_name;
              }
              if (component.types.includes('country')) {
                country = component.long_name;
              }
            }
          }

          const hotelData = {
            name: place.name,
            address: place.formatted_address,
            city: city || '',
            country: country || '',
            placeId: place.place_id,
            location: place.geometry?.location
              ? {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng(),
                }
              : null,
          };

          setInputValue(place.name);
          setShowSuggestions(false);
          setSuggestions([]);

          // Create new session token for next search
          sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();

          if (onSelect) {
            onSelect(hotelData);
          }
        }
      }
    );
  }, [onSelect]);

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    if (onChange) {
      onChange('');
    }
    if (onSelect) {
      onSelect(null);
    }
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Hotel className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className={cn('pl-10 pr-10', inputClassName)}
          disabled={disabled}
          autoComplete="off"
        />
        {isLoading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        ) : inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 py-1 shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className={cn(
                'w-full px-3 py-2 text-left flex items-start gap-3 hover:bg-slate-50 transition',
                selectedIndex === index && 'bg-slate-50'
              )}
            >
              <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">
                  {suggestion.structured_formatting?.main_text || suggestion.description}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {suggestion.structured_formatting?.secondary_text || ''}
                </p>
              </div>
            </button>
          ))}
          <div className="px-3 py-1.5 border-t">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <img 
                src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3_hdpi.png" 
                alt="Powered by Google" 
                className="h-3"
              />
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
