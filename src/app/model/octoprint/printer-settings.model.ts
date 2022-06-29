export interface OctoprintSettings {
  temperature: {
    profiles: OctoprintTempProfile[];
  };
}

export interface OctoprintTempProfile {
  bed: number;
  chamber: number;
  extruder: number;
  name: string;
}
