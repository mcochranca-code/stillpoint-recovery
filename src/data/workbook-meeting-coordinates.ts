import type { MeetingVenueCoordinate } from './meeting-coordinates';

/** Exact Census matches from workbook addresses only; non-exact and unmatched rows are omitted. */
export const workbookMeetingCoordinateMetadata = {
  "provider": "U.S. Census Geocoder",
  "documentationUrl": "https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html",
  "benchmark": "Public_AR_Current",
  "benchmarkId": 4,
  "checkedAt": "2026-10-26",
  "physicalOrHybridRows": 166,
  "uniqueAddressQueries": 85,
  "matchExact": 55,
  "matchNonExact": 27,
  "noMatch": 3,
  "distinctExactLocations": 52,
  "methodNote": "Only official Census batch results with Match + Exact are mapped. Census coordinates are interpolated address-range positions, not surveyed venue entrances. The app never geocodes at runtime or requests device location."
} as const;

export const workbookMeetingCoordinateEntries: Record<string, MeetingVenueCoordinate> = {
  "fresno|3425 e. shields ave, fresno, ca 93726": {
    "latitude": 36.779609829203,
    "longitude": -119.767575097883,
    "matchedAddress": "3425 E SHIELDS AVE, FRESNO, CA, 93726",
    "sourceAddress": "3425 E. Shields Ave, Fresno, CA 93726",
    "sourceCity": "Fresno"
  },
  "atwater|1251 grove ave": {
    "latitude": 37.350944525154,
    "longitude": -120.60708950966,
    "matchedAddress": "1251 GROVE AVE, ATWATER, CA, 95301",
    "sourceAddress": "1251 Grove Ave",
    "sourceCity": "Atwater"
  },
  "merced|2610 ranchero ln": {
    "latitude": 37.326662670899,
    "longitude": -120.536340121314,
    "matchedAddress": "2610 RANCHERO LN, MERCED, CA, 95348",
    "sourceAddress": "2610 Ranchero Ln",
    "sourceCity": "Merced"
  },
  "los banos|903 e pacheco blvd": {
    "latitude": 37.056781505005,
    "longitude": -120.846945685789,
    "matchedAddress": "903 E PACHECO BLVD, LOS BANOS, CA, 93635",
    "sourceAddress": "903 E Pacheco Blvd",
    "sourceCity": "Los Banos"
  },
  "merced|620 w 14th st": {
    "latitude": 37.298761171236,
    "longitude": -120.487106357548,
    "matchedAddress": "620 W 14TH ST, MERCED, CA, 95340",
    "sourceAddress": "620 W 14th St",
    "sourceCity": "Merced"
  },
  "merced|1040 canal st": {
    "latitude": 37.294312027882,
    "longitude": -120.487346642438,
    "matchedAddress": "1040 CANAL ST, MERCED, CA, 95341",
    "sourceAddress": "1040 Canal St",
    "sourceCity": "Merced"
  },
  "merced|3135 meadows ave, apt 76": {
    "latitude": 37.31994608342,
    "longitude": -120.490482796473,
    "matchedAddress": "3135 MEADOWS AVE, MERCED, CA, 95348",
    "sourceAddress": "3135 Meadows Ave, Apt 76",
    "sourceCity": "Merced"
  },
  "delhi|9711 stephens st": {
    "latitude": 37.429841130745,
    "longitude": -120.77595156553,
    "matchedAddress": "9711 STEPHENS ST, DELHI, CA, 95315",
    "sourceAddress": "9711 Stephens St",
    "sourceCity": "Delhi"
  },
  "dos palos|1934 marguerite st": {
    "latitude": 36.986768583356,
    "longitude": -120.627031522934,
    "matchedAddress": "1934 MARGUERITE ST, DOS PALOS, CA, 93620",
    "sourceAddress": "1934 Marguerite St",
    "sourceCity": "Dos Palos"
  },
  "merced|500 buena vista drive": {
    "latitude": 37.327277313207,
    "longitude": -120.475743794591,
    "matchedAddress": "500 BUENA VISTA DR, MERCED, CA, 95348",
    "sourceAddress": "500 Buena Vista Drive",
    "sourceCity": "Merced"
  },
  "los banos|1443 w i st": {
    "latitude": 37.055003863044,
    "longitude": -120.866285411239,
    "matchedAddress": "1443 W I ST, LOS BANOS, CA, 93635",
    "sourceAddress": "1443 W I St",
    "sourceCity": "Los Banos"
  },
  "merced|500 buena vista dr": {
    "latitude": 37.327277313207,
    "longitude": -120.475743794591,
    "matchedAddress": "500 BUENA VISTA DR, MERCED, CA, 95348",
    "sourceAddress": "500 Buena Vista Dr",
    "sourceCity": "Merced"
  },
  "three rivers|43410 sierra dr.": {
    "latitude": 36.457691741499,
    "longitude": -118.87727356914,
    "matchedAddress": "43410 SIERRA DR, THREE RIVERS, CA, 93271",
    "sourceAddress": "43410 Sierra Dr.",
    "sourceCity": "Three Rivers"
  },
  "visalia|109 nw 2nd ave": {
    "latitude": 36.336879792929,
    "longitude": -119.29254150136,
    "matchedAddress": "109 NW 2ND AVE, VISALIA, CA, 93291",
    "sourceAddress": "109 NW 2nd Ave",
    "sourceCity": "Visalia"
  },
  "mariposa|5117 bullion st": {
    "latitude": 37.490693406308,
    "longitude": -119.969436657171,
    "matchedAddress": "5117 BULLION ST, MARIPOSA, CA, 95338",
    "sourceAddress": "5117 Bullion St",
    "sourceCity": "Mariposa"
  },
  "alameda|1510 oak st, alameda, ca 94501": {
    "latitude": 37.766262156952,
    "longitude": -122.243061073633,
    "matchedAddress": "1510 OAK ST, ALAMEDA, CA, 94501",
    "sourceAddress": "1510 Oak St, Alameda, CA 94501",
    "sourceCity": "Alameda"
  },
  "oakland|100 hegenberger road, suite 300, room 30, oakland, ca 94621": {
    "latitude": 37.730538117977,
    "longitude": -122.199515603436,
    "matchedAddress": "100 HEGENBERGER RD, OAKLAND, CA, 94621",
    "sourceAddress": "100 Hegenberger Road, Suite 300, Room 30, Oakland, CA 94621",
    "sourceCity": "Oakland"
  },
  "berkeley|1931 center st, berkeley, ca 94704": {
    "latitude": 37.869845845466,
    "longitude": -122.27207904203,
    "matchedAddress": "1931 CENTER ST, BERKELEY, CA, 94704",
    "sourceAddress": "1931 Center St, Berkeley, CA 94704",
    "sourceCity": "Berkeley"
  },
  "oakland|1424 jefferson st, oakland, ca 94612": {
    "latitude": 37.805928553609,
    "longitude": -122.274617775063,
    "matchedAddress": "1424 JEFFERSON ST, OAKLAND, CA, 94612",
    "sourceAddress": "1424 Jefferson St, Oakland, CA 94612",
    "sourceCity": "Oakland"
  },
  "oakland|1500 90th avenue, oakland, ca 94603": {
    "latitude": 37.750084807449,
    "longitude": -122.173110749608,
    "matchedAddress": "1500 90TH AVE, OAKLAND, CA, 94603",
    "sourceAddress": "1500 90th Avenue, Oakland, CA 94603",
    "sourceCity": "Oakland"
  },
  "san leandro|13055 aurora dr, san leandro, ca 94577": {
    "latitude": 37.704141345203,
    "longitude": -122.18625444568,
    "matchedAddress": "13055 AURORA DR, SAN LEANDRO, CA, 94577",
    "sourceAddress": "13055 Aurora Dr, San Leandro, CA 94577",
    "sourceCity": "San Leandro"
  },
  "oakland|3210 fruitvale ave, oakland, ca 94602": {
    "latitude": 37.797249897141,
    "longitude": -122.217298464342,
    "matchedAddress": "3210 FRUITVALE AVE, OAKLAND, CA, 94602",
    "sourceAddress": "3210 Fruitvale Ave, Oakland, CA 94602",
    "sourceCity": "Oakland"
  },
  "fremont|37051 cabrillo terrace, fremont, ca 94536": {
    "latitude": 37.551782223952,
    "longitude": -122.017784322957,
    "matchedAddress": "37051 CABRILLO TER, FREMONT, CA, 94536",
    "sourceAddress": "37051 Cabrillo Terrace, Fremont, CA 94536",
    "sourceCity": "Fremont"
  },
  "oakland|1607 8th st, oakland, ca 94607": {
    "latitude": 37.80702218126,
    "longitude": -122.297771981301,
    "matchedAddress": "1607 8TH ST, OAKLAND, CA, 94607",
    "sourceAddress": "1607 8th St, Oakland, CA 94607",
    "sourceCity": "Oakland"
  },
  "alameda|1910 santa clara ave, alameda, ca 94501": {
    "latitude": 37.769929808937,
    "longitude": -122.252702526572,
    "matchedAddress": "1910 SANTA CLARA AVE, ALAMEDA, CA, 94501",
    "sourceAddress": "1910 Santa Clara Ave, Alameda, CA 94501",
    "sourceCity": "Alameda"
  },
  "oakland|3207 lakeshore ave, oakland, ca 94610": {
    "latitude": 37.810176664172,
    "longitude": -122.246063501856,
    "matchedAddress": "3207 LAKESHORE AVE, OAKLAND, CA, 94610",
    "sourceAddress": "3207 Lakeshore Ave, Oakland, CA 94610",
    "sourceCity": "Oakland"
  },
  "oakland|4400 market st, oakland, ca 94608": {
    "latitude": 37.833821103346,
    "longitude": -122.27312377225,
    "matchedAddress": "4400 MARKET ST, OAKLAND, CA, 94608",
    "sourceAddress": "4400 Market St, Oakland, CA 94608",
    "sourceCity": "Oakland"
  },
  "castro valley|20121 santa maria ave, castro valley, ca 94546": {
    "latitude": 37.698839473718,
    "longitude": -122.078504338507,
    "matchedAddress": "20121 SANTA MARIA AVE, CASTRO VALLEY, CA, 94546",
    "sourceAddress": "20121 Santa Maria Ave, Castro Valley, CA 94546",
    "sourceCity": "Castro Valley"
  },
  "san leandro|1600 bancroft ave, san leandro, ca 94577": {
    "latitude": 37.724477044903,
    "longitude": -122.146573209909,
    "matchedAddress": "1600 BANCROFT AVE, SAN LEANDRO, CA, 94577",
    "sourceAddress": "1600 Bancroft Ave, San Leandro, CA 94577",
    "sourceCity": "San Leandro"
  },
  "oakland|3600 broadway, oakland, ca 94611": {
    "latitude": 37.823357467588,
    "longitude": -122.259194577793,
    "matchedAddress": "3600 BROADWAY, OAKLAND, CA, 94611",
    "sourceAddress": "3600 Broadway, Oakland, CA 94611",
    "sourceCity": "Oakland"
  },
  "oakland|380 w macarthur blvd, oakland, ca 94609": {
    "latitude": 37.825118914293,
    "longitude": -122.260608259842,
    "matchedAddress": "380 W MACARTHUR BLVD, OAKLAND, CA, 94609",
    "sourceAddress": "380 W MacArthur Blvd, Oakland, CA 94609",
    "sourceCity": "Oakland"
  },
  "newark|6330 thornton ave, newark, ca 94560": {
    "latitude": 37.534364021843,
    "longitude": -122.032514969037,
    "matchedAddress": "6330 THORNTON AVE, NEWARK, CA, 94560",
    "sourceAddress": "6330 Thornton Ave, Newark, CA 94560",
    "sourceCity": "Newark"
  },
  "alameda|1252 mckay ave, alameda, ca 94501": {
    "latitude": 37.769082769282,
    "longitude": -122.278386916343,
    "matchedAddress": "1252 MCKAY AVE, ALAMEDA, CA, 94501",
    "sourceAddress": "1252 McKay Ave, Alameda, CA 94501",
    "sourceCity": "Alameda"
  },
  "berkeley|1823 9th st, berkeley, ca 94710": {
    "latitude": 37.870923575961,
    "longitude": -122.295100328051,
    "matchedAddress": "1823 9TH ST, BERKELEY, CA, 94710",
    "sourceAddress": "1823 9th St, Berkeley, CA 94710",
    "sourceCity": "Berkeley"
  },
  "livermore|1660 freisman rd, livermore, ca 94588": {
    "latitude": 37.700725330475,
    "longitude": -121.836610303223,
    "matchedAddress": "1660 FREISMAN RD, LIVERMORE, CA, 94551",
    "sourceAddress": "1660 Freisman Rd, Livermore, CA 94588",
    "sourceCity": "Livermore"
  },
  "fremont|37051 cabrillo terrace, fremont, ca 94536-5721": {
    "latitude": 37.551782223952,
    "longitude": -122.017784322957,
    "matchedAddress": "37051 CABRILLO TER, FREMONT, CA, 94536",
    "sourceAddress": "37051 Cabrillo Terrace, Fremont, CA 94536-5721",
    "sourceCity": "Fremont"
  },
  "los angeles|757 south fetterly avenue, 2nd floor, suite 204": {
    "latitude": 34.023508388378,
    "longitude": -118.16413457466,
    "matchedAddress": "757 S FETTERLY AVE, LOS ANGELES, CA, 90022",
    "sourceAddress": "757 South Fetterly Avenue, 2nd Floor, Suite 204",
    "sourceCity": "Los Angeles"
  },
  "santa monica|3301 pico blvd": {
    "latitude": 34.026938948137,
    "longitude": -118.45524601317,
    "matchedAddress": "3301 PICO BLVD, SANTA MONICA, CA, 90405",
    "sourceAddress": "3301 Pico Blvd",
    "sourceCity": "Santa Monica"
  },
  "los angeles|2900 sunset boulevard": {
    "latitude": 34.082966717531,
    "longitude": -118.273453678908,
    "matchedAddress": "2900 SUNSET BLVD, LOS ANGELES, CA, 90026",
    "sourceAddress": "2900 Sunset Boulevard",
    "sourceCity": "Los Angeles"
  },
  "los angeles|3217 north eastern avenue": {
    "latitude": 34.082735448486,
    "longitude": -118.178111841257,
    "matchedAddress": "3217 N EASTERN AVE, LOS ANGELES, CA, 90032",
    "sourceAddress": "3217 North Eastern Avenue",
    "sourceCity": "Los Angeles"
  },
  "culver city|6666 green valley circle": {
    "latitude": 33.978830130089,
    "longitude": -118.385455882959,
    "matchedAddress": "6666 GREEN VALLEY CIR, CULVER CITY, CA, 90230",
    "sourceAddress": "6666 Green Valley Circle",
    "sourceCity": "Culver City"
  },
  "agoura hills|29295 agoura road": {
    "latitude": 34.143534664726,
    "longitude": -118.763952510185,
    "matchedAddress": "29295 AGOURA RD, AGOURA HILLS, CA, 91301",
    "sourceAddress": "29295 Agoura Road",
    "sourceCity": "Agoura Hills"
  },
  "los angeles|5326 east beverly boulevard": {
    "latitude": 34.030314824162,
    "longitude": -118.150791351769,
    "matchedAddress": "5326 E BEVERLY BLVD, LOS ANGELES, CA, 90022",
    "sourceAddress": "5326 East Beverly Boulevard",
    "sourceCity": "Los Angeles"
  },
  "west hollywood|7929 melrose avenue": {
    "latitude": 34.083859091496,
    "longitude": -118.362140954358,
    "matchedAddress": "7929 MELROSE AVE, WEST HOLLYWOOD, CA, 90046",
    "sourceAddress": "7929 Melrose Avenue",
    "sourceCity": "West Hollywood"
  },
  "los angeles|4876 gleason street": {
    "latitude": 34.036000701301,
    "longitude": -118.161151646659,
    "matchedAddress": "4876 GLEASON ST, LOS ANGELES, CA, 90022",
    "sourceAddress": "4876 Gleason Street",
    "sourceCity": "Los Angeles"
  },
  "montebello|115 south taylor avenue": {
    "latitude": 34.010956343745,
    "longitude": -118.114138285381,
    "matchedAddress": "115 S TAYLOR AVE, MONTEBELLO, CA, 90640",
    "sourceAddress": "115 South Taylor Avenue",
    "sourceCity": "Montebello"
  },
  "los angeles|757 south fetterly avenue, suite 204": {
    "latitude": 34.023508388378,
    "longitude": -118.16413457466,
    "matchedAddress": "757 S FETTERLY AVE, LOS ANGELES, CA, 90022",
    "sourceAddress": "757 South Fetterly Avenue, Suite 204",
    "sourceCity": "Los Angeles"
  },
  "los angeles|3367 glendale boulevard": {
    "latitude": 34.119739969105,
    "longitude": -118.259277798133,
    "matchedAddress": "3367 GLENDALE BLVD, LOS ANGELES, CA, 90039",
    "sourceAddress": "3367 Glendale Boulevard",
    "sourceCity": "Los Angeles"
  },
  "los angeles|1453 west temple street": {
    "latitude": 34.067632951217,
    "longitude": -118.258077419792,
    "matchedAddress": "1453 W TEMPLE ST, LOS ANGELES, CA, 90026",
    "sourceAddress": "1453 West Temple Street",
    "sourceCity": "Los Angeles"
  },
  "los angeles|4099 north mission road": {
    "latitude": 34.076551151085,
    "longitude": -118.19480683936,
    "matchedAddress": "4099 N MISSION RD, LOS ANGELES, CA, 90032",
    "sourceAddress": "4099 North Mission Road",
    "sourceCity": "Los Angeles"
  },
  "los angeles|130 bruno street": {
    "latitude": 34.062475392547,
    "longitude": -118.235637374845,
    "matchedAddress": "130 BRUNO ST, LOS ANGELES, CA, 90012",
    "sourceAddress": "130 Bruno Street",
    "sourceCity": "Los Angeles"
  },
  "sherman oaks|5056 van nuys boulevard": {
    "latitude": 34.163099316142,
    "longitude": -118.448629776231,
    "matchedAddress": "5056 VAN NUYS BLVD, SHERMAN OAKS, CA, 91403",
    "sourceAddress": "5056 Van Nuys Boulevard",
    "sourceCity": "Sherman Oaks"
  },
  "santa monica|2500 broadway": {
    "latitude": 34.030754121154,
    "longitude": -118.474117221583,
    "matchedAddress": "2500 BROADWAY, SANTA MONICA, CA, 90404",
    "sourceAddress": "2500 Broadway",
    "sourceCity": "Santa Monica"
  },
  "los angeles|2844 east 2nd street": {
    "latitude": 34.039403350199,
    "longitude": -118.204749999269,
    "matchedAddress": "2844 E 2ND ST, LOS ANGELES, CA, 90033",
    "sourceAddress": "2844 East 2nd Street",
    "sourceCity": "Los Angeles"
  },
  "montebello|2518 west beverly boulevard": {
    "latitude": 34.021098428967,
    "longitude": -118.128990754212,
    "matchedAddress": "2518 W BEVERLY BLVD, MONTEBELLO, CA, 90640",
    "sourceAddress": "2518 West Beverly Boulevard",
    "sourceCity": "Montebello"
  }
};
