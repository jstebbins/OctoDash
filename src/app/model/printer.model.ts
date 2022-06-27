export interface PrinterStatus {
  status: PrinterState;
  bed: Temperature;
  tool0: Temperature;
  fanSpeed: number;
  position: Position;
  probeOffset: XYZ;
  homeOffset: XYZ;
}

interface XYZ {
  x: number;
  y: number;
  z: number;
}

interface Position {
  x: number;
  y: number;
  z: number;
  tool: number;
  e: number;
  feedrate: number;
}

interface Temperature {
  current: number;
  set: number;
  unit: string;
}

export enum PrinterState {
  operational,
  pausing,
  paused,
  printing,
  cancelling,
  closed,
  connecting,
  reconnecting,
  socketDead,
}
