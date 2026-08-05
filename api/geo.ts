export const config = {
  runtime: 'edge', // Runs on Vercel's global CDN nodes closest to the user
};

export default async function handler(request: Request) {
  // 1. Intercept Vercel's native location and IP injection headers
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const city = request.headers.get('x-vercel-ip-city') || 'Berlin';
  const region = request.headers.get('x-vercel-ip-country-region') || 'Germany';
  const latitude = request.headers.get('x-vercel-ip-latitude') || '52.52';
  const longitude = request.headers.get('x-vercel-ip-longitude') || '13.41';

  // 2. Build a safe payload containing clean default values
  const payload = {
    ip: ip.split(',')[0].trim(), // Strips out cascading proxy addresses if they exist
    city: decodePercentageEncodings(city),
    region: region || 'Germany',
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
  };

  // 3. Return a clean application/json response vector
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0', // Massive privacy issue, we cannot save approximate location information on the server
    },
  });
}

// Helper to decode special characters or spaces in city names (e.g., "New%20York")
function decodePercentageEncodings(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch (e) {
    return str;
  }
}