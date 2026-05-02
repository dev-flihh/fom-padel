export type CourtSuggestion = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  type?: string;
};

const mapToCourtSuggestions = (items: any[], queryLower: string): CourtSuggestion[] => {
  const cityLikeTypes = new Set([
    'city',
    'town',
    'village',
    'municipality',
    'administrative',
    'county',
    'state',
    'province',
    'district',
    'suburb'
  ]);

  const scoreSuggestion = (item: CourtSuggestion) => {
    const name = item.name.toLowerCase();
    const address = item.address.toLowerCase();
    const type = (item.type || '').toLowerCase();
    let score = 0;

    if (cityLikeTypes.has(type)) score += 100;
    if (name.startsWith(queryLower)) score += 40;
    if (name.includes(queryLower)) score += 25;
    if (address.includes(queryLower)) score += 10;
    if (name.includes('padel') || name.includes('court') || name.includes('arena')) score += 8;

    return score;
  };

  return items
    .map((item: any) => {
      const lat = Number(item.lat);
      const lon = Number(item.lon);
      const name = item.name || item.display_name || '';
      const address = item.address || '';
      const id = item.id || `${name}:${lat}:${lon}`;
      return { id, name, address, lat, lon, type: item.type || '' };
    })
    .filter((item: CourtSuggestion) => item.name && !Number.isNaN(item.lat) && !Number.isNaN(item.lon))
    .sort((a, b) => scoreSuggestion(b) - scoreSuggestion(a))
    .slice(0, 6);
};

export const searchCourtSuggestions = async ({
  query,
  googleMapsApiKey,
  googlePlacesBlocked
}: {
  query: string;
  googleMapsApiKey?: string;
  googlePlacesBlocked: boolean;
}): Promise<{
  suggestions: CourtSuggestion[];
  provider: 'google' | 'osm' | 'none';
  googlePlacesBlocked: boolean;
}> => {
  const queryWithPadel = query;
  const queryLower = query.toLowerCase();
  let suggestions: CourtSuggestion[] = [];
  let nextGooglePlacesBlocked = googlePlacesBlocked;
  let provider: 'google' | 'osm' | 'none' = 'none';

  if (googleMapsApiKey && !googlePlacesBlocked) {
    try {
      const googleResponse = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googleMapsApiKey,
          'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat'
        },
        body: JSON.stringify({
          input: queryWithPadel,
          languageCode: 'id',
          regionCode: 'ID'
        })
      });

      if (!googleResponse.ok) {
        if (googleResponse.status === 403) {
          nextGooglePlacesBlocked = true;
        }
        throw new Error(`Google Places failed: ${googleResponse.status}`);
      }

      const googleData = await googleResponse.json();
      const googleSuggestions: CourtSuggestion[] = (googleData?.suggestions || [])
        .map((item: any) => {
          const prediction = item?.placePrediction;
          const mainText = prediction?.structuredFormat?.mainText?.text || prediction?.text?.text || '';
          const secondaryText = prediction?.structuredFormat?.secondaryText?.text || '';
          const placeId = prediction?.placeId || '';
          return {
            id: `google:${placeId}`,
            name: mainText,
            address: secondaryText,
            lat: 0,
            lon: 0,
            type: ''
          };
        })
        .filter((item: CourtSuggestion) => item.name && item.id !== 'google:');

      suggestions = googleSuggestions.slice(0, 6);
      if (suggestions.length > 0) {
        provider = 'google';
      }
    } catch (googleErr) {
      console.warn('Google Places unavailable, fallback to OSM:', googleErr);
    }
  }

  try {
    if (suggestions.length > 0) {
      return { suggestions, provider, googlePlacesBlocked: nextGooglePlacesBlocked };
    }

    const photonResponse = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(queryWithPadel)}&lang=en&limit=8`);
    if (!photonResponse.ok) {
      throw new Error(`Photon failed: ${photonResponse.status}`);
    }
    const photonData = await photonResponse.json();
    const photonItems = (photonData?.features || []).map((feature: any) => {
      const props = feature?.properties || {};
      const coordinates = feature?.geometry?.coordinates || [];
      const addressParts = [props.city, props.state, props.country].filter(Boolean);
      return {
        id: `${props.osm_type || ''}:${props.osm_id || ''}:${coordinates[1]}:${coordinates[0]}`,
        name: props.name || props.street || '',
        address: addressParts.join(', '),
        lat: coordinates[1],
        lon: coordinates[0],
        type: props.type || ''
      };
    });
    suggestions = mapToCourtSuggestions(photonItems, queryLower);
    if (suggestions.length > 0) {
      provider = 'osm';
    }
  } catch (photonErr) {
    console.warn('Photon unavailable, fallback to Nominatim:', photonErr);
  }

  if (suggestions.length === 0) {
    const nominatimResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&accept-language=id&countrycodes=id&q=${encodeURIComponent(queryWithPadel)}`);
    if (!nominatimResponse.ok) {
      throw new Error(`Nominatim failed: ${nominatimResponse.status}`);
    }
    const nominatimData = await nominatimResponse.json();
    const nominatimItems = (nominatimData || []).map((item: any) => ({
      id: `nominatim:${item.place_id || ''}:${item.lat}:${item.lon}`,
      name: item.name || (item.display_name ? String(item.display_name).split(',')[0] : ''),
      address: item.display_name || '',
      lat: item.lat,
      lon: item.lon,
      type: item.type || item.addresstype || ''
    }));
    suggestions = mapToCourtSuggestions(nominatimItems, queryLower);
    if (suggestions.length > 0) {
      provider = 'osm';
    }
  }

  return { suggestions, provider, googlePlacesBlocked: nextGooglePlacesBlocked };
};
