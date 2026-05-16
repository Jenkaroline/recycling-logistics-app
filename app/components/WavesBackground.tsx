import React from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Path } from "react-native-svg";

type Props = {
  dark?: boolean;
  style?: any;
};

export default function WavesBackground({ dark = false, style }: Props) {
  const { width } = useWindowDimensions();
  const height = Math.min(380, Math.max(200, Math.round(width * 0.44)));

  const color1 = dark ? "#0b2a43" : "#eaf6ff";
  const color2 = dark ? "#08324a" : "#d7eefc";

  return (
    <View pointerEvents="none" style={[styles.container, { height, transform: [{ translateY: -12 }] }, style]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={color1} stopOpacity="0.20" />
            <Stop offset="1" stopColor={color2} stopOpacity="0.10" />
          </LinearGradient>
          <LinearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={color2} stopOpacity="0.14" />
            <Stop offset="1" stopColor={color1} stopOpacity="0.06" />
          </LinearGradient>
        </Defs>

        <Path
          d={`M0 ${height * 0.56} C ${width * 0.25} ${height * 0.36}, ${width * 0.6} ${height * 0.82}, ${width} ${height * 0.56} L ${width} 0 L 0 0 Z`}
          fill="url(#g1)"
        />

        <Path
          d={`M0 ${height * 0.78} C ${width * 0.2} ${height * 0.55}, ${width * 0.5} ${height}, ${width} ${height * 0.82} L ${width} 0 L 0 0 Z`}
          fill="url(#g2)"
        />

        <Path
          d={`M0 ${height * 0.9} C ${width * 0.15} ${height * 0.72}, ${width * 0.45} ${height * 1.02}, ${width} ${height * 0.9} L ${width} 0 L 0 0 Z`}
          fill={dark ? "rgba(8,50,70,0.03)" : "rgba(54,163,255,0.04)"}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
});
