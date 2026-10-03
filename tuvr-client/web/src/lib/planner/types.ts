import type { Coordinate, Stop, TransitRoute } from "../types";

export interface StopOccurrence {
  stop: Stop;
  order: number;
  sequence?: number;
  arrivalTime?: number;
  departureTime?: number;
}

export interface RouteVariant {
  route: TransitRoute;
  routeId?: string;
  journeyId?: string;
  day?: string;
  direction?: string;
  shape?: Coordinate[];
  occurrences: StopOccurrence[];
}

export interface JourneyLeg {
  route: TransitRoute;
  routeId?: string;
  journeyId?: string;
  day?: string;
  direction?: string;
  shape?: Coordinate[];
  boarding: StopOccurrence;
  alighting: StopOccurrence;
  intermediateStops: StopOccurrence[];
}

export interface JourneyOption {
  id: string;
  kind: "direct";
  quality: "confirmed";
  leg: JourneyLeg;
}

export interface JourneySearchResult {
  options: JourneyOption[];
  incomplete: boolean;
  candidateRouteIds: string[];
  unconfirmedRouteIds: string[];
}
