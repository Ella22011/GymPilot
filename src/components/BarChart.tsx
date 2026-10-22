import { StyleSheet, Text, View } from "react-native";

export type BarDatum = {
  label: string;
  value: number;
  /** Optional text shown above the bar (defaults to nothing). */
  valueLabel?: string;
  highlight?: boolean;
};

type Props = {
  data: BarDatum[];
  height?: number;
};

/** A simple bar chart made of Views, so no chart library is needed. */
export function BarChart({ data, height = 140 }: Props) {
  const max = Math.max(0, ...data.map((d) => d.value));

  return (
    <View>
      <View style={[styles.bars, { height: height + 18 }]}>
        {data.map((d, index) => {
          const barHeight = max > 0 ? Math.max(d.value > 0 ? 4 : 0, (d.value / max) * height) : 0;
          return (
            <View key={`${d.label}-${index}`} style={styles.column}>
              {d.valueLabel !== undefined && d.value > 0 && (
                <Text
                  style={[styles.valueLabel, d.highlight && styles.valueLabelHighlight]}
                  numberOfLines={1}
                >
                  {d.valueLabel}
                </Text>
              )}
              <View
                style={[
                  styles.bar,
                  { height: barHeight },
                  d.highlight ? styles.barHighlight : null,
                  d.value === 0 && styles.barEmpty,
                ]}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.labels}>
        {data.map((d, index) => (
          <Text
            key={`${d.label}-label-${index}`}
            style={[styles.label, d.highlight && styles.labelHighlight]}
            numberOfLines={1}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#242B2F",
  },

  column: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },

  bar: {
    width: "100%",
    maxWidth: 28,
    backgroundColor: "#2E5D47",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },

  barHighlight: {
    backgroundColor: "#63E6A3",
  },

  barEmpty: {
    height: 2,
    backgroundColor: "#242B2F",
  },

  valueLabel: {
    color: "#7D8589",
    fontSize: 10,
    marginBottom: 4,
  },

  valueLabelHighlight: {
    color: "#63E6A3",
    fontWeight: "700",
  },

  labels: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },

  label: {
    flex: 1,
    color: "#7D8589",
    fontSize: 10,
    textAlign: "center",
  },

  labelHighlight: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
