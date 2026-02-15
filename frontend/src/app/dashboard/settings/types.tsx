export interface UserMaterial {
  id: string;
  price: string;
  material: {
    id: string;
    brand: string | null;
    calcType: string;
    length: number;
    width: number;
    image: string | null;
    materialType: { name: string };
  };
}

export interface UserHardware {
  id: string;
  price: string;
  hardware: {
    id: string;
    brand: string | null;
    image: string | null;
    hardwareType: { name: string };
  };
}

export interface UserService {
  id: string;
  sawingPrice: string;
  drillingPrice: string;
  edgeBandingPrice: string;
  technologistPercent: string;
  designerPercent: string;
  assemblyPercent: string;
  deliveryPrice: string;
  profitType: "COEF" | "FIXED";
  profitValue: string;
}
