import { District } from '../src/engine/types';

export const DISTRICTS: District[] = [
  { name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126 },
  { name: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577 },
  { name: 'Jabalpur', state: 'Madhya Pradesh', lat: 23.1685, lng: 79.9339 },
  { name: 'Gwalior', state: 'Madhya Pradesh', lat: 26.2183, lng: 78.1828 },
  { name: 'Ujjain', state: 'Madhya Pradesh', lat: 23.1765, lng: 75.7885 },
  { name: 'Sagar', state: 'Madhya Pradesh', lat: 23.8315, lng: 78.7299 },
  { name: 'Rewa', state: 'Madhya Pradesh', lat: 24.5335, lng: 81.3043 },
  { name: 'Sehore', state: 'Madhya Pradesh', lat: 23.1963, lng: 77.0858 },
  { name: 'Vidisha', state: 'Madhya Pradesh', lat: 23.5243, lng: 77.8061 },
  { name: 'Raisen', state: 'Madhya Pradesh', lat: 23.3305, lng: 77.7825 },
  { name: 'Hoshangabad', state: 'Madhya Pradesh', lat: 22.7512, lng: 77.7214 },
  { name: 'Khandwa', state: 'Madhya Pradesh', lat: 21.8254, lng: 76.3468 },
  { name: 'Chhindwara', state: 'Madhya Pradesh', lat: 22.0579, lng: 78.9402 },
  { name: 'Satna', state: 'Madhya Pradesh', lat: 24.5745, lng: 80.8322 },
  { name: 'Katni', state: 'Madhya Pradesh', lat: 23.8375, lng: 80.3917 },
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { name: 'Kanpur Nagar', state: 'Uttar Pradesh', lat: 26.4499, lng: 80.3319 },
  { name: 'Sitapur', state: 'Uttar Pradesh', lat: 27.5690, lng: 80.6830 },
  { name: 'Hardoi', state: 'Uttar Pradesh', lat: 27.4186, lng: 80.1164 },
  { name: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739 },
  { name: 'Prayagraj', state: 'Uttar Pradesh', lat: 25.4358, lng: 81.8463 },
  { name: 'Raebareli', state: 'Uttar Pradesh', lat: 26.2300, lng: 81.2330 },
];

export function findDistrict(name: string): District | undefined {
  return DISTRICTS.find((d) => d.name === name);
}
