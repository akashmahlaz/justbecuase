import { NextResponse } from 'next/server';

/**
 * Location API - Uses free OpenStreetMap Nominatim for geocoding
 * No API key required. Returns state/region level data for privacy.
 * 
 * GET  → IP-based location (uses ip-api.com, free tier)
 * POST → Forward/reverse geocoding via Nominatim (state/region level)
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'JustBecauseNetwork/1.0 (contact@justbecause.network)';

export async function GET() {
  try {
    // Use free ip-api.com for IP-based geolocation
    const response = await fetch('http://ip-api.com/json/?fields=status,city,regionName,country,lat,lon', {
      headers: { 'User-Agent': USER_AGENT },
    });
    const data = await response.json();

    if (data.status === 'success') {
      return NextResponse.json({
        success: true,
        location: {
          city: data.city || 'Unknown',
          region: data.regionName || 'Unknown',
          country: data.country || 'Unknown',
          coordinates: data.lat && data.lon ? { lat: data.lat, lng: data.lon } : null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      location: { city: 'Unknown', region: 'Unknown', country: 'Unknown', coordinates: null },
    });
  } catch (error) {
    console.error('IP location error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get location from IP' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { lat, lng, address } = await req.json();

    let url: string;
    if (lat !== undefined && lng !== undefined) {
      // Reverse geocoding (coordinates → address) via Nominatim — state/region level
      url = `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=5&addressdetails=1`;
    } else if (address) {
      // Forward geocoding (address → coordinates) via Nominatim
      url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`;
    } else {
      return NextResponse.json({ success: false, error: 'Missing coordinates or address' });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ success: false, error: 'Geocoding service unavailable' });
    }

    const data = await response.json();

    // Nominatim returns an object for reverse, array for search
    const result = Array.isArray(data) ? data[0] : data;

    if (!result || result.error) {
      return NextResponse.json({ success: false, error: result?.error || 'No results found' });
    }

    const addr = result.address || {};
    const state = addr.state || addr.state_district || addr.region || null;
    const country = addr.country || null;

    const locationData = {
      formatted: [state, country].filter(Boolean).join(', ') || result.display_name,
      state,
      country,
      // Keep city for backward compatibility but prefer state
      city: state,
      postalCode: addr.postcode || null,
      coordinates: {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
      },
    };

    return NextResponse.json({ success: true, location: locationData });
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json({ success: false, error: 'Server error' });
  }
}