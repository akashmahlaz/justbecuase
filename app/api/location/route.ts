import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // For IP-based location, we'll use a simple fallback
    // In production, you might want to use a proper IP geolocation service
    return NextResponse.json({
      success: true,
      location: {
        city: "Unknown",
        region: "Unknown",
        country: "Unknown",
        coordinates: null
      }
    });
  } catch (error) {
    console.error('IP location error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get location from IP' 
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    console.log('[Location API Debug] Received POST request to /api/location');
    const { lat, lng, address } = await req.json();
    console.log('[Location API Debug] Request body:', { lat, lng, address });

    let url;
    if (lat !== undefined && lng !== undefined) {
      // Reverse geocoding (coordinates to address)
      console.log('[Location API Debug] Performing reverse geocoding for coordinates:', { lat, lng });
      url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    } else if (address) {
      // Forward geocoding (address to coordinates)
      console.log('[Location API Debug] Performing forward geocoding for address:', address);
      url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    } else {
      console.log('[Location API Debug] Missing coordinates or address in request');
      return NextResponse.json({ success: false, error: "Missing coordinates or address" });
    }

    console.log('[Location API Debug] Making request to Google Geocoding API');
    const response = await fetch(url);
    console.log('[Location API Debug] Google API response status:', response.status);
    const data = await response.json();
    console.log('[Location API Debug] Google API response data status:', data.status);

    if (data.status === "REQUEST_DENIED") {
      console.error("[Location API Debug] Google Geocoding API Error - Request Denied. Check API key configuration.");
      console.error("[Location API Debug] Full error response:", data.error_message);
      return NextResponse.json({ 
        success: false, 
        error: "API key configuration error. Please contact support.",
        status: "REQUEST_DENIED",
        error_message: data.error_message
      });
    }
    
    if (data.status !== "OK" || !data.results?.length) {
      console.error('[Location API Debug] Geocoding failed with status:', data.status, 'and results:', data.results);
      return NextResponse.json({ 
        success: false, 
        error: data.status || "Geocoding failed" 
      });
    }

    const result = data.results[0];
    const components = result.address_components;
    console.log('[Location API Debug] Successfully retrieved location data, parsing components');

    const getLocationData = () => {
      const findComponent = (types: string[]) => {
        const component = components.find((comp: any) => 
          types.some(type => comp.types.includes(type))
        );
        return component ? component.long_name : null;
      };

      const locationData = {
        formatted: result.formatted_address,
        city: findComponent(["locality", "political"]) || findComponent(["sublocality", "political"]),
        state: findComponent(["administrative_area_level_1", "political"]),
        country: findComponent(["country", "political"]),
        postalCode: findComponent(["postal_code"]),
        coordinates: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng
        }
      };
      
      console.log('[Location API Debug] Parsed location data:', locationData);
      return locationData;
    };

    const locationData = getLocationData();
    console.log('[Location API Debug] Returning success with location data');
    return NextResponse.json({
      success: true,
      location: locationData
    });
  } catch (error) {
    console.error("[Location API Debug] Geocoding error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Server error" 
    });
  }
}