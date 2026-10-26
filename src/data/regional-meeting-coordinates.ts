import type { MeetingVenueCoordinate } from './meeting-coordinates';

export const regionalMeetingCoordinateMetadata = {
  provider: 'U.S. Census Geocoder',
  benchmark: 'Public_AR_Current',
  checkedAt: '2026-10-26',
  inputAddressRows: 35,
  exactAddressMatches: 27,
  nonExactMatches: 7,
  tiedMatches: 0,
  noMatches: 1,
  distinctExactLocations: 23,
  exactInputRowsByCounty: {
    'Fresno County': 11,
    'Mariposa County': 1,
    'Merced County': 15,
  },
  distinctExactLocationsByCounty: {
    'Fresno County': 9,
    'Mariposa County': 1,
    'Merced County': 13,
  },
} as const;

/** Only Census batch results returned as Match + Exact are included. */
export const regionalMeetingCoordinateEntries: Record<string, MeetingVenueCoordinate> = {
  "atwater|2124 first street (atwater baptist church), atwater": { latitude: 37.354056, longitude: -120.601104, matchedAddress: "2124 1ST ST, ATWATER, CA, 95301", sourceAddress: "2124 First Street (Atwater Baptist Church), Atwater", sourceCity: "Atwater" },
  "clovis|1519 tollhouse rd, clovis, ca 93611": { latitude: 36.829148, longitude: -119.68716, matchedAddress: "1519 TOLLHOUSE RD, CLOVIS, CA, 93611", sourceAddress: "1519 Tollhouse Rd, Clovis, CA 93611", sourceCity: "Clovis" },
  "fresno|3425 e. shields ave, fresno, ca 93726": { latitude: 36.77961, longitude: -119.767575, matchedAddress: "3425 E SHIELDS AVE, FRESNO, CA, 93726", sourceAddress: "3425 E. Shields Ave, Fresno, CA 93726", sourceCity: "Fresno" },
  "fresno|alano club, 1350 n 11th st, fresno, ca 93703": { latitude: 36.760431, longitude: -119.756647, matchedAddress: "1350 N 11TH ST, FRESNO, CA, 93703", sourceAddress: "Alano Club, 1350 N 11th St, Fresno, CA 93703", sourceCity: "Fresno" },
  "fresno|alano club, 1350 n. 11th st., fresno": { latitude: 36.760431, longitude: -119.756647, matchedAddress: "1350 N 11TH ST, FRESNO, CA, 93703", sourceAddress: "Alano Club, 1350 N. 11th St., Fresno", sourceCity: "Fresno" },
  "fresno|community united church of christ, 5550 n fresno st, fresno, ca 93710": { latitude: 36.818529, longitude: -119.781246, matchedAddress: "5550 N FRESNO ST, FRESNO, CA, 93710", sourceAddress: "Community United Church of Christ, 5550 N Fresno St, Fresno, CA 93710", sourceCity: "Fresno" },
  "fresno|hope lutheran church, 5435 n. fresno st., fresno, ca 93710": { latitude: 36.816988, longitude: -119.781399, matchedAddress: "5435 N FRESNO ST, FRESNO, CA, 93710", sourceAddress: "Hope Lutheran Church, 5435 N. Fresno St., Fresno, CA 93710", sourceCity: "Fresno" },
  "fresno|hope lutheran church, room 26, 5435 n. fresno st., fresno": { latitude: 36.816988, longitude: -119.781399, matchedAddress: "5435 N FRESNO ST, FRESNO, CA, 93710", sourceAddress: "Hope Lutheran Church, Room 26, 5435 N. Fresno St., Fresno", sourceCity: "Fresno" },
  "fresno|trinity lutheran church, 3973 n. cedar ave., fresno": { latitude: 36.789448, longitude: -119.754373, matchedAddress: "3973 N CEDAR AVE, FRESNO, CA, 93726", sourceAddress: "Trinity Lutheran Church, 3973 N. Cedar Ave., Fresno", sourceCity: "Fresno" },
  "kerman|15050 w clinton ave, kerman, ca 93630": { latitude: 36.771384, longitude: -120.06282, matchedAddress: "15050 W CLINTON AVE, KERMAN, CA, 93630", sourceAddress: "15050 W Clinton Ave, Kerman, CA 93630", sourceCity: "Kerman" },
  "los banos|1031 iowa ave (united methodist church), los banos": { latitude: 37.061768, longitude: -120.861294, matchedAddress: "1031 IOWA AVE, LOS BANOS, CA, 93635", sourceAddress: "1031 Iowa Ave (United Methodist Church), Los Banos", sourceCity: "Los Banos" },
  "mariposa|american legion hall, 5117 bullion st, mariposa": { latitude: 37.490693, longitude: -119.969437, matchedAddress: "5117 BULLION ST, MARIPOSA, CA, 95338", sourceAddress: "American Legion Hall, 5117 Bullion St, Mariposa", sourceCity: "Mariposa" },
  "merced|1040 canal st, merced, ca 95341": { latitude: 37.294312, longitude: -120.487347, matchedAddress: "1040 CANAL ST, MERCED, CA, 95341", sourceAddress: "1040 Canal St, Merced, CA 95341", sourceCity: "Merced" },
  "merced|305 w. 26th street (unity church, enter in the back), merced": { latitude: 37.309402, longitude: -120.475251, matchedAddress: "305 W 26TH ST, MERCED, CA, 95340", sourceAddress: "305 W. 26th Street (Unity Church, enter in the back), Merced", sourceCity: "Merced" },
  "merced|3135 meadows ave apt 76, merced, ca 95348": { latitude: 37.319946, longitude: -120.490483, matchedAddress: "3135 MEADOWS AVE, MERCED, CA, 95348", sourceAddress: "3135 Meadows Ave apt 76, Merced, CA 95348", sourceCity: "Merced" },
  "merced|353 e donna dr m4, merced, ca 95340": { latitude: 37.329827, longitude: -120.465934, matchedAddress: "353 E DONNA DR, MERCED, CA, 95340", sourceAddress: "353 E Donna Dr m4, Merced, CA 95340", sourceCity: "Merced" },
  "merced|500 buena vista dr, merced": { latitude: 37.327277, longitude: -120.475744, matchedAddress: "500 BUENA VISTA DR, MERCED, CA, 95348", sourceAddress: "500 Buena Vista Dr, Merced", sourceCity: "Merced" },
  "merced|500 buena vista dr., merced": { latitude: 37.327277, longitude: -120.475744, matchedAddress: "500 BUENA VISTA DR, MERCED, CA, 95348", sourceAddress: "500 Buena Vista Dr., Merced", sourceCity: "Merced" },
  "merced|500 buena vista drive, merced": { latitude: 37.327277, longitude: -120.475744, matchedAddress: "500 BUENA VISTA DR, MERCED, CA, 95348", sourceAddress: "500 Buena Vista Drive, Merced", sourceCity: "Merced" },
  "merced|620 w 14th st, merced, ca 95340": { latitude: 37.298761, longitude: -120.487106, matchedAddress: "620 W 14TH ST, MERCED, CA, 95340", sourceAddress: "620 W 14th St, Merced, CA 95340", sourceCity: "Merced" },
  "merced|899 yosemite pkwy (united methodist church), merced": { latitude: 37.295268, longitude: -120.463751, matchedAddress: "899 YOSEMITE PKWY, MERCED, CA, 95340", sourceAddress: "899 Yosemite Pkwy (United Methodist Church), Merced", sourceCity: "Merced" },
  "merced|beachwood-franklin community park, 2610 ranchero ln, merced, ca 95348": { latitude: 37.326663, longitude: -120.53634, matchedAddress: "2610 RANCHERO LN, MERCED, CA, 95348", sourceAddress: "Beachwood-Franklin Community Park, 2610 Ranchero Ln, Merced, CA 95348", sourceCity: "Merced" },
  "merced|central presbyterian church, 520 w 20th st, merced, ca 95340": { latitude: 37.304488, longitude: -120.481987, matchedAddress: "520 W 20TH ST, MERCED, CA, 95340", sourceAddress: "Central Presbyterian Church, 520 W 20th St, Merced, CA 95340", sourceCity: "Merced" },
  "merced|hybrid; 1207 e 21st st, merced, ca 95340": { latitude: 37.297651, longitude: -120.45973, matchedAddress: "1207 E 21ST ST, MERCED, CA, 95340", sourceAddress: "Hybrid; 1207 E 21st St, Merced, CA 95340", sourceCity: "Merced" },
  "parlier|736 fresno st, parlier, ca 93648": { latitude: 36.611342, longitude: -119.528495, matchedAddress: "736 FRESNO ST, PARLIER, CA, 93648", sourceAddress: "736 Fresno St, Parlier, CA 93648", sourceCity: "Parlier" },
  "selma|first united methodist church, 1702 cross st, selma, ca 93662": { latitude: 36.567913, longitude: -119.608563, matchedAddress: "1702 CROSS ST, SELMA, CA, 93662", sourceAddress: "First United Methodist Church, 1702 Cross St, Selma, CA 93662", sourceCity: "Selma" },
  "winton|5890 n winton wy (faith home community bible church), winton": { latitude: 37.372823, longitude: -120.613625, matchedAddress: "5890 N WINTON WAY, WINTON, CA, 95388", sourceAddress: "5890 N Winton Wy (Faith Home Community Bible Church), Winton", sourceCity: "Winton" },
};
