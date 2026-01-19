
import type { Segment } from "./segments-apple-region";

export const COUNTRY_TO_APPLE_SEGMENT: Record<string, Segment> = {
    
    "United States": "Americas", Canada: "Americas", Mexico: "Americas",
    Brazil: "Americas", Argentina: "Americas", Chile: "Americas",
    Colombia: "Americas", Peru: "Americas",

    
    "United Kingdom": "Europe", Ireland: "Europe", Germany: "Europe",
    France: "Europe", Italy: "Europe", Spain: "Europe", Netherlands: "Europe",
    Belgium: "Europe", Switzerland: "Europe", Austria: "Europe",
    Sweden: "Europe", Norway: "Europe", Denmark: "Europe", Finland: "Europe",
    Poland: "Europe", Czechia: "Europe", Portugal: "Europe", Greece: "Europe",
    Hungary: "Europe", Romania: "Europe",
    India: "Europe",
    "United Arab Emirates": "Europe", "Saudi Arabia": "Europe", Qatar: "Europe",
    Israel: "Europe", Turkey: "Europe", Egypt: "Europe", Morocco: "Europe",
    Nigeria: "Europe", Kenya: "Europe", "South Africa": "Europe",

    
    China: "Greater China", "Hong Kong": "Greater China", Taiwan: "Greater China",

    
    Japan: "Japan",

    
    Australia: "Rest of Asia Pacific", "New Zealand": "Rest of Asia Pacific",
    "South Korea": "Rest of Asia Pacific", Singapore: "Rest of Asia Pacific",
    Thailand: "Rest of Asia Pacific", Malaysia: "Rest of Asia Pacific",
    Indonesia: "Rest of Asia Pacific", Vietnam: "Rest of Asia Pacific",
    Philippines: "Rest of Asia Pacific",
};
