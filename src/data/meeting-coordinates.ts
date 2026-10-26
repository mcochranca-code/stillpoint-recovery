import type { MeetingListing } from './meetings';
import { regionalMeetingCoordinateEntries, regionalMeetingCoordinateMetadata } from './regional-meeting-coordinates';

export interface MeetingVenueCoordinate {
  latitude: number;
  longitude: number;
  matchedAddress: string;
  sourceAddress: string;
  sourceCity: string;
}

export const meetingCoordinateMetadata = {
  provider: 'U.S. Census Geocoder',
  benchmark: 'Public_AR_Current',
  checkedAt: '2026-10-26',
  stanislausCheckedAt: '2026-10-24',
  exactAddressMatches: 80,
  distinctCoordinates: 63,
  omitted: { nonExact: 11, tie: 2, noMatch: 3 },
  regionalSnapshot: regionalMeetingCoordinateMetadata,
  sourceUrl: 'https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html',
  method: 'Interpolated along TIGER address ranges; approximate, not an entrance survey.',
} as const;

function normalizedPart(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

export function meetingVenueCoordinateKey(address: string, city: string): string {
  return `${normalizedPart(city)}|${normalizedPart(address)}`;
}

const coordinateEntries: Record<string, MeetingVenueCoordinate> = {
  "ceres|(src) 1904 richland ave": {
    latitude: 37.600223,
    longitude: -120.965935,
    matchedAddress: "1904 RICHLAND AVE, CERES, CA, 95307",
    sourceAddress: "(SRC) 1904 Richland Ave",
    sourceCity: "Ceres",
  },
  "ceres|1660 herndon rd (alano club)": {
    latitude: 37.605631,
    longitude: -120.972392,
    matchedAddress: "1660 HERNDON RD, CERES, CA, 95307",
    sourceAddress: "1660 Herndon Rd (Alano Club)",
    sourceCity: "Ceres",
  },
  "ceres|1660 herndon rd, ceres, ca 95307": {
    latitude: 37.605631,
    longitude: -120.972392,
    matchedAddress: "1660 HERNDON RD, CERES, CA, 95307",
    sourceAddress: "1660 Herndon Rd, Ceres, CA 95307",
    sourceCity: "Ceres",
  },
  "ceres|1660 herndon road (alano club)": {
    latitude: 37.605631,
    longitude: -120.972392,
    matchedAddress: "1660 HERNDON RD, CERES, CA, 95307",
    sourceAddress: "1660 Herndon Road (Alano Club)",
    sourceCity: "Ceres",
  },
  "ceres|1904 richland ave (src room b-111)": {
    latitude: 37.600223,
    longitude: -120.965935,
    matchedAddress: "1904 RICHLAND AVE, CERES, CA, 95307",
    sourceAddress: "1904 Richland Ave (SRC room B-111)",
    sourceCity: "Ceres",
  },
  "ceres|1904 richland ave, ceres, ca 95307": {
    latitude: 37.600223,
    longitude: -120.965935,
    matchedAddress: "1904 RICHLAND AVE, CERES, CA, 95307",
    sourceAddress: "1904 Richland Ave, Ceres, CA 95307",
    sourceCity: "Ceres",
  },
  "ceres|2929 malik ave, ceres, ca 95307": {
    latitude: 37.591157,
    longitude: -120.979304,
    matchedAddress: "2929 MALIK AVE, CERES, CA, 95307",
    sourceAddress: "2929 Malik Ave, Ceres, CA 95307",
    sourceCity: "Ceres",
  },
  "ceres|3026 4th st": {
    latitude: 37.589872,
    longitude: -120.953264,
    matchedAddress: "3026 4TH ST, CERES, CA, 95307",
    sourceAddress: "3026 4th St",
    sourceCity: "Ceres",
  },
  "hughson|1519 tully rd, hughson, ca 95326": {
    latitude: 37.608766,
    longitude: -120.870205,
    matchedAddress: "1519 TULLY RD, HUGHSON, CA, 95326",
    sourceAddress: "1519 Tully Rd, Hughson, CA 95326",
    sourceCity: "Hughson",
  },
  "modesto|1010 carver rd": {
    latitude: 37.657105,
    longitude: -121.021875,
    matchedAddress: "1010 CARVER RD, MODESTO, CA, 95350",
    sourceAddress: "1010 Carver Rd",
    sourceCity: "Modesto",
  },
  "modesto|1010 carver rd (park on street)": {
    latitude: 37.657105,
    longitude: -121.021875,
    matchedAddress: "1010 CARVER RD, MODESTO, CA, 95350",
    sourceAddress: "1010 Carver rd (park on street)",
    sourceCity: "Modesto",
  },
  "modesto|1064 woodland ave, modesto, ca 95351": {
    latitude: 37.653137,
    longitude: -121.021729,
    matchedAddress: "1064 WOODLAND AVE, MODESTO, CA, 95351",
    sourceAddress: "1064 Woodland Ave, Modesto, CA 95351",
    sourceCity: "Modesto",
  },
  "modesto|1100 carver rd, modesto, ca 95350": {
    latitude: 37.658702,
    longitude: -121.021887,
    matchedAddress: "1100 CARVER RD, MODESTO, CA, 95350",
    sourceAddress: "1100 Carver Rd, Modesto, CA 95350",
    sourceCity: "Modesto",
  },
  "modesto|112 n santa cruz ave, modesto, ca 95354": {
    latitude: 37.638789,
    longitude: -120.974112,
    matchedAddress: "112 N SANTA CRUZ AVE, MODESTO, CA, 95354",
    sourceAddress: "112 N Santa Cruz Ave, Modesto, CA 95354",
    sourceCity: "Modesto",
  },
  "modesto|1203 tully rd, modesto, ca 95350": {
    latitude: 37.660483,
    longitude: -121.012178,
    matchedAddress: "1203 TULLY RD, MODESTO, CA, 95350",
    sourceAddress: "1203 Tully Rd, Modesto, CA 95350",
    sourceCity: "Modesto",
  },
  "modesto|1315 la loma ave (la loma grace church)": {
    latitude: 37.639948,
    longitude: -120.974017,
    matchedAddress: "1315 LA LOMA AVE, MODESTO, CA, 95354",
    sourceAddress: "1315 La Loma Ave (La Loma Grace Church)",
    sourceCity: "Modesto",
  },
  "modesto|1320 l st": {
    latitude: 37.644721,
    longitude: -120.999446,
    matchedAddress: "1320 L ST, MODESTO, CA, 95354",
    sourceAddress: "1320 L St",
    sourceCity: "Modesto",
  },
  "modesto|140 calaveras ave, modesto, ca 95354": {
    latitude: 37.629904,
    longitude: -120.996412,
    matchedAddress: "140 CALAVERAS AVE, MODESTO, CA, 95354",
    sourceAddress: "140 Calaveras Ave, Modesto, CA 95354",
    sourceCity: "Modesto",
  },
  "modesto|1425 standiford ave, modesto, ca 95350": {
    latitude: 37.689477,
    longitude: -121.017466,
    matchedAddress: "1425 STANDIFORD AVE, MODESTO, CA, 95350",
    sourceAddress: "1425 Standiford Ave, Modesto, CA 95350",
    sourceCity: "Modesto",
  },
  "modesto|1601 yosemite blvd, modesto, ca 95354": {
    latitude: 37.638248,
    longitude: -120.969634,
    matchedAddress: "1601 YOSEMITE BLVD, MODESTO, CA, 95354",
    sourceAddress: "1601 Yosemite Blvd, Modesto, CA 95354",
    sourceCity: "Modesto",
  },
  "modesto|1661 crows landing rd, modesto, ca 95358": {
    latitude: 37.606471,
    longitude: -120.993606,
    matchedAddress: "1661 CROWS LANDING RD, MODESTO, CA, 95358",
    sourceAddress: "1661 Crows Landing Rd, Modesto, CA 95358",
    sourceCity: "Modesto",
  },
  "modesto|1918 sherwood ave, modesto, ca 95350": {
    latitude: 37.671641,
    longitude: -120.998525,
    matchedAddress: "1918 SHERWOOD AVE, MODESTO, CA, 95350",
    sourceAddress: "1918 Sherwood Ave, Modesto, CA 95350",
    sourceCity: "Modesto",
  },
  "modesto|1918 sherwood ave.": {
    latitude: 37.671641,
    longitude: -120.998525,
    matchedAddress: "1918 SHERWOOD AVE, MODESTO, CA, 95350",
    sourceAddress: "1918 Sherwood Ave.",
    sourceCity: "Modesto",
  },
  "modesto|3460 oakdale rd, modesto, ca 95355": {
    latitude: 37.688234,
    longitude: -120.95787,
    matchedAddress: "3460 OAKDALE RD, MODESTO, CA, 95355",
    sourceAddress: "3460 Oakdale Rd, Modesto, CA 95355",
    sourceCity: "Modesto",
  },
  "modesto|3800 cornucopia wy": {
    latitude: 37.583854,
    longitude: -120.99358,
    matchedAddress: "3800 CORNUCOPIA WAY, MODESTO, CA, 95358",
    sourceAddress: "3800 Cornucopia Wy",
    sourceCity: "Modesto",
  },
  "modesto|406 motor city ct, modesto, ca 95356": {
    latitude: 37.700825,
    longitude: -120.997642,
    matchedAddress: "406 MOTOR CITY CT, MODESTO, CA, 95356",
    sourceAddress: "406 Motor City Ct, Modesto, CA 95356",
    sourceCity: "Modesto",
  },
  "modesto|430 downey ave, modesto, ca 95354": {
    latitude: 37.645437,
    longitude: -120.98791,
    matchedAddress: "430 DOWNEY AVE, MODESTO, CA, 95354",
    sourceAddress: "430 Downey Ave, Modesto, CA 95354",
    sourceCity: "Modesto",
  },
  "modesto|713 16th st": {
    latitude: 37.64201,
    longitude: -120.991352,
    matchedAddress: "713 16TH ST, MODESTO, CA, 95354",
    sourceAddress: "713 16th St",
    sourceCity: "Modesto",
  },
  "modesto|800 rose ave, modesto, ca 95355": {
    latitude: 37.654954,
    longitude: -120.966432,
    matchedAddress: "800 ROSE AVE, MODESTO, CA, 95355",
    sourceAddress: "800 Rose Ave, Modesto, CA 95355",
    sourceCity: "Modesto",
  },
  "modesto|800 scenic dr (redwood room)": {
    latitude: 37.647136,
    longitude: -120.984089,
    matchedAddress: "800 SCENIC DR, MODESTO, CA, 95350",
    sourceAddress: "800 Scenic Dr (Redwood Room)",
    sourceCity: "Modesto",
  },
  "modesto|800 scenic dr (redwoods room)": {
    latitude: 37.647136,
    longitude: -120.984089,
    matchedAddress: "800 SCENIC DR, MODESTO, CA, 95350",
    sourceAddress: "800 Scenic Dr (Redwoods Room)",
    sourceCity: "Modesto",
  },
  "modesto|823 e orangeburg ave": {
    latitude: 37.663646,
    longitude: -120.983354,
    matchedAddress: "823 E ORANGEBURG AVE, MODESTO, CA, 95350",
    sourceAddress: "823 E Orangeburg Ave",
    sourceCity: "Modesto",
  },
  "modesto|823 e. orangeburg ave": {
    latitude: 37.663646,
    longitude: -120.983354,
    matchedAddress: "823 E ORANGEBURG AVE, MODESTO, CA, 95350",
    sourceAddress: "823 E. Orangeburg Ave",
    sourceCity: "Modesto",
  },
  "modesto|901 w rumble rd (davis park church)": {
    latitude: 37.682033,
    longitude: -121.004021,
    matchedAddress: "901 W RUMBLE RD, MODESTO, CA, 95350",
    sourceAddress: "901 W Rumble Rd (Davis Park Church)",
    sourceCity: "Modesto",
  },
  "modesto|harvest hall 3800 cornucopia wy": {
    latitude: 37.583854,
    longitude: -120.99358,
    matchedAddress: "3800 CORNUCOPIA WAY, MODESTO, CA, 95358",
    sourceAddress: "Harvest Hall 3800 Cornucopia Wy",
    sourceCity: "Modesto",
  },
  "newman|1107 kern st (orestimba presbyterian church)": {
    latitude: 37.316852,
    longitude: -121.024841,
    matchedAddress: "1107 KERN ST, NEWMAN, CA, 95360",
    sourceAddress: "1107 Kern St (Orestimba Presbyterian Church)",
    sourceCity: "Newman",
  },
  "newman|1107 kern st, newman, ca 95360": {
    latitude: 37.316852,
    longitude: -121.024841,
    matchedAddress: "1107 KERN ST, NEWMAN, CA, 95360",
    sourceAddress: "1107 Kern St, Newman, CA 95360",
    sourceCity: "Newman",
  },
  "newman|910 r st, newman, ca 95360": {
    latitude: 37.31975,
    longitude: -121.028619,
    matchedAddress: "910 R ST, NEWMAN, CA, 95360",
    sourceAddress: "910 R St, Newman, CA 95360",
    sourceCity: "Newman",
  },
  "oakdale|1040 w f st (sierra foothills community church)": {
    latitude: 37.761731,
    longitude: -120.858714,
    matchedAddress: "1040 W F ST, OAKDALE, CA, 95361",
    sourceAddress: "1040 W F St (Sierra Foothills Community Church)",
    sourceCity: "Oakdale",
  },
  "oakdale|1040 w. f st oakdale, ca sierra foothill community church": {
    latitude: 37.761731,
    longitude: -120.858714,
    matchedAddress: "1040 W F ST, OAKDALE, CA, 95361",
    sourceAddress: "1040 W. F st Oakdale, CA Sierra Foothill Community Church",
    sourceCity: "Oakdale",
  },
  "oakdale|190 s oak ave, oakdale, ca 95361": {
    latitude: 37.759498,
    longitude: -120.861395,
    matchedAddress: "190 S OAK AVE, OAKDALE, CA, 95361",
    sourceAddress: "190 S Oak Ave, Oakdale, CA 95361",
    sourceCity: "Oakdale",
  },
  "oakdale|350 s oak ave, oakdale, ca 95361": {
    latitude: 37.757533,
    longitude: -120.860063,
    matchedAddress: "350 S OAK AVE, OAKDALE, CA, 95361",
    sourceAddress: "350 S Oak Ave, Oakdale, CA 95361",
    sourceCity: "Oakdale",
  },
  "patterson|435 w. las palmas ave": {
    latitude: 37.470612,
    longitude: -121.132282,
    matchedAddress: "435 W LAS PALMAS AVE, PATTERSON, CA, 95363",
    sourceAddress: "435 W. Las Palmas Ave",
    sourceCity: "Patterson",
  },
  "patterson|501 n 1st st, patterson, ca 95363": {
    latitude: 37.479054,
    longitude: -121.132191,
    matchedAddress: "501 N 1ST ST, PATTERSON, CA, 95363",
    sourceAddress: "501 N 1st St, Patterson, CA 95363",
    sourceCity: "Patterson",
  },
  "riverbank|3744 atchison st, riverbank, ca 95367": {
    latitude: 37.7379,
    longitude: -120.927967,
    matchedAddress: "3744 ATCHISON ST, RIVERBANK, CA, 95367",
    sourceAddress: "3744 Atchison St, Riverbank, CA 95367",
    sourceCity: "Riverbank",
  },
  "turlock|(hope church) 316 s. laurel st.": {
    latitude: 37.490248,
    longitude: -120.851344,
    matchedAddress: "316 S LAUREL ST, TURLOCK, CA, 95380",
    sourceAddress: "(Hope Church) 316 S. Laurel St.",
    sourceCity: "Turlock",
  },
  "turlock|2006 e tuolumne rd, turlock, ca 95382": {
    latitude: 37.514427,
    longitude: -120.825922,
    matchedAddress: "2006 E TUOLUMNE RD, TURLOCK, CA, 95382",
    sourceAddress: "2006 E Tuolumne Rd, Turlock, CA 95382",
    sourceCity: "Turlock",
  },
  "turlock|2619 n berkeley ave, turlock, ca 95382": {
    latitude: 37.516632,
    longitude: -120.830849,
    matchedAddress: "2619 N BERKELEY AVE, TURLOCK, CA, 95382",
    sourceAddress: "2619 N Berkeley Ave, Turlock, CA 95382",
    sourceCity: "Turlock",
  },
  "turlock|316 s. laurel street (hope church)": {
    latitude: 37.490248,
    longitude: -120.851344,
    matchedAddress: "316 S LAUREL ST, TURLOCK, CA, 95380",
    sourceAddress: "316 S. Laurel Street (Hope Church)",
    sourceCity: "Turlock",
  },
  "turlock|893 lander ave, turlock, ca 95380": {
    latitude: 37.484349,
    longitude: -120.849042,
    matchedAddress: "893 LANDER AVE, TURLOCK, CA, 95380",
    sourceAddress: "893 Lander Ave, Turlock, CA 95380",
    sourceCity: "Turlock",
  },
  "turlock|915 e main st, turlock, ca 95380": {
    latitude: 37.500967,
    longitude: -120.837245,
    matchedAddress: "915 E MAIN ST, TURLOCK, CA, 95380",
    sourceAddress: "915 E Main St, Turlock, CA 95380",
    sourceCity: "Turlock",
  },
  "waterford|14143 yosemite blvd, waterford, ca 95386": {
    latitude: 37.640261,
    longitude: -120.737763,
    matchedAddress: "14143 YOSEMITE BLVD, WATERFORD, CA, 95386",
    sourceAddress: "14143 Yosemite Blvd, Waterford, CA 95386",
    sourceCity: "Waterford",
  },
  ...regionalMeetingCoordinateEntries,
};

export function meetingVenueCoordinateFor(meeting: Pick<MeetingListing, 'address' | 'city'>): MeetingVenueCoordinate | undefined {
  return coordinateEntries[meetingVenueCoordinateKey(meeting.address, meeting.city)];
}
