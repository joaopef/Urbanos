export type Coordinate = [number, number];

export interface Position {
  lat: number;
  lon: number;
}

export interface TransitRoute {
  id: string;
  name: string;
  nameShort?: string;
  description?: string;
  color?: string;
  isActive?: boolean;
}

export interface Stop {
  id: string;
  name: string;
  nameShort?: string;
  position?: Position;
  sequence?: number;
}

export interface VehicleLocation {
  id: string;
  position?: Position;
  route?: TransitRoute;
  routeId?: string;
  journeyId?: string;
  color?: string;
  status?: string;
  busStatus?: string;
  speed?: number;
  delay?: number;
  sourceUpdatedAt?: string;
  directionLabel?: string;
}

export interface RouteDetail {
  route: TransitRoute;
  stops: Stop[];
  shape: Coordinate[];
  variants: OrderedRouteVariant[];
  variantDataAvailable: boolean;
}

export interface OrderedRouteVariant {
  routeId?: string;
  journeyId?: string;
  day?: string;
  direction?: string;
  stops: Stop[];
}

export interface StopJourneyTime {
  journeyId: string;
  departure?: string;
  departureTime?: number;
  direction?: number;
}

export interface JourneyCirculation {
  sequence: number;
  stop: Stop;
  arrivalTime?: number;
  departureTime?: number;
  delay?: number;
  nextArrivalTime?: number;
  dueInMinutes?: number;
}

export interface JourneyDetail {
  routeId: string;
  journeyId: string;
  direction?: string;
  shape: Coordinate[];
  circulations: JourneyCirculation[];
}

export interface VehicleStop extends Stop {
  arrivalTime?: string;
  departureTime?: string;
  dueInMinutes?: number;
  stage?: string;
}

export interface StopRouteService {
  route: TransitRoute;
  journeys: Array<{
    id?: string;
    name?: string;
    description?: string;
    direction?: string;
    start?: number | string;
    end?: number | string;
    startTime?: number | string;
    endTime?: number | string;
    isActive?: boolean;
    type?: string;
  }>;
}

export interface VehicleDetail extends VehicleLocation {
  journey?: {
    id?: string;
    name?: string;
    description?: string;
    direction?: string;
    startTime?: string;
    endTime?: string;
    isActive?: boolean;
    type?: string;
  };
  stops: VehicleStop[];
  currentStopSequence?: number;
  fleetId?: string;
  licensePlate?: string;
}

export type ConnectionState = "loading" | "success" | "empty" | "stale" | "error";
