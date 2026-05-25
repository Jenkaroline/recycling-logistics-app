import { Platform } from "react-native";

// Import the appropriate component based on platform
let MapsComponent: any;

if (Platform.OS === "web") {
  MapsComponent = require("./maps.web").default;
} else {
  MapsComponent = require("./maps.native").default;
}

export default MapsComponent;

