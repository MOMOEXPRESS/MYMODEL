// PDF renderer for the comp card. Uses @react-pdf/renderer primitives —
// similar to React but limited to Page/View/Text/Image/StyleSheet.
//
// The output is always A4 portrait. Keeping it single-page and single-template
// for v1; §5 brief calls for 2–3 templates, the second lives in Sprint 4.5
// once we've seen which booker layout people actually prefer.

import { Document, Page, Text, View, Image, StyleSheet, Font } from "@react-pdf/renderer";
import type { CompCardData } from "@/lib/compcard";
import { statLines } from "@/lib/compcard";

// Built-in Helvetica covers Latin-1 fine (French accents included). No
// remote font fetches — keeps the serverless invocation fast.

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: "Helvetica",
    color: "#0B0B0C",
    backgroundColor: "#FAFAF7",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  agencyName: {
    fontSize: 10,
    letterSpacing: 2,
    color: "#54545A",
    textTransform: "uppercase",
  },
  modelName: {
    fontSize: 22,
    fontFamily: "Times-Roman",
    marginTop: 4,
  },
  division: {
    fontSize: 9,
    color: "#8A8A92",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 2,
  },
  agencyBlock: {
    textAlign: "right",
  },
  body: {
    flexDirection: "row",
    gap: 14,
    flex: 1,
  },
  heroWrap: {
    flex: 2,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "#EEEAE1",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  sidePanel: {
    flex: 1,
    gap: 10,
  },
  thumbGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  thumbWrap: {
    width: "48%",
    height: 110,
    backgroundColor: "#EEEAE1",
    borderRadius: 2,
    overflow: "hidden",
  },
  thumb: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  statsPanel: {
    marginTop: "auto",
    paddingTop: 12,
    borderTop: "1px solid #E7E5DF",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  statLabel: {
    fontSize: 9,
    color: "#8A8A92",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 10,
  },
  footer: {
    marginTop: 12,
    fontSize: 8,
    color: "#8A8A92",
    textAlign: "right",
  },
  placeholderHero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 9,
    color: "#8A8A92",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});

export function CompCardDocument({ data }: { data: CompCardData }) {
  const [hero, ...thumbs] = data.imageUrls;
  const stats = statLines(data.measurements);

  return (
    <Document author={data.agencyName} title={`${data.modelName} — Comp card`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.agencyName}>{data.agencyName}</Text>
            <Text style={styles.modelName}>{data.modelName}</Text>
            <Text style={styles.division}>{data.division.replace("_", " ")}</Text>
          </View>
          <View style={styles.agencyBlock}>
            {data.agencyLogoUrl ? (
              <Image src={data.agencyLogoUrl} style={{ width: 60, height: 60 }} />
            ) : (
              <Text style={styles.agencyName}>{data.agencyCity ?? ""}</Text>
            )}
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.heroWrap}>
            {hero ? (
              <Image src={hero} style={styles.heroImage} />
            ) : (
              <View style={styles.placeholderHero}>
                <Text style={styles.placeholderText}>No photo</Text>
              </View>
            )}
          </View>

          <View style={styles.sidePanel}>
            <View style={styles.thumbGrid}>
              {thumbs.slice(0, 4).map((url, i) => (
                <View style={styles.thumbWrap} key={i}>
                  <Image src={url} style={styles.thumb} />
                </View>
              ))}
            </View>

            <View style={styles.statsPanel}>
              {stats.map((s) => (
                <View style={styles.statRow} key={s.label}>
                  <Text style={styles.statLabel}>{s.label}</Text>
                  <Text style={styles.statValue}>{s.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          {data.agencyName}
          {data.agencyCity ? ` · ${data.agencyCity}` : ""} · luxlane.app
        </Text>
      </Page>
    </Document>
  );
}
