import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { helpImages, type HelpImage, type HelpImageKey } from "@/help/images";
import type { HelpBlock, HelpLink } from "@/help/types";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import { Pressable, ScrollView, Text, TextStyle, View } from "react-native";
import HelpImageViewer from "./HelpImageViewer";

/** Texto con **negritas** (etiquetas de botones y campos). */
export function RichText({ text, style }: { text: string; style?: TextStyle }) {
  const { colors } = useTheme();
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return (
    <Text style={style}>
      {parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <Text key={index} style={{ fontWeight: "700", color: colors.text }}>
            {part.slice(2, -2)}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

const CALLOUT_ICONS = {
  tip: "lightbulb-on-outline",
  warning: "alert-outline",
  info: "information-outline",
} as const;

interface HelpBlocksProps {
  blocks: HelpBlock[];
  onLinkPress: (link: HelpLink) => void;
}

export default function HelpBlocks({ blocks, onLinkPress }: HelpBlocksProps) {
  const { colors } = useTheme();
  const [viewerImage, setViewerImage] = useState<{
    image: HelpImageKey;
    caption?: string;
  } | null>(null);

  const styles = useThemedStyles((c) => ({
    paragraph: { ...tokens.typography.body, color: c.textSecondary, lineHeight: 22 },
    row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    stepNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      marginTop: -1,
    },
    stepNumberText: { ...tokens.typography.caption, fontWeight: "700", color: c.primary },
    bullet: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.textMuted,
      marginTop: 8,
      marginHorizontal: 9,
    },
    itemText: { ...tokens.typography.body, color: c.textSecondary, lineHeight: 22, flex: 1 },
    list: { gap: 8 },
    imageWrap: { alignSelf: "center", width: "100%", gap: 6 },
    imageFrame: {
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
      backgroundColor: c.surfaceMuted,
      ...tokens.shadow.sm,
    },
    caption: { ...tokens.typography.caption, color: c.textMuted, textAlign: "center" },
    gallery: { gap: 12, paddingBottom: 4 },
    galleryItem: { width: 220, gap: 6 },
    callout: {
      flexDirection: "row",
      gap: 10,
      padding: 12,
      borderRadius: tokens.radius.md,
      borderLeftWidth: 3,
    },
    calloutText: { ...tokens.typography.body, color: c.text, lineHeight: 21, flex: 1 },
    flow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
    flowStep: {
      ...tokens.typography.bodySm,
      fontWeight: "600",
      color: c.text,
      backgroundColor: c.surfaceMuted,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: tokens.radius.sm,
      overflow: "hidden",
    },
    flowNote: { ...tokens.typography.bodySm, color: c.textMuted, marginTop: 6 },
    definition: { flexDirection: "row", gap: 10, paddingVertical: 4 },
    dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
    definitionBody: { flex: 1, gap: 2 },
    term: { ...tokens.typography.bodyMd, fontWeight: "700", color: c.text },
    link: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: tokens.radius.sm,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    linkLabel: { ...tokens.typography.bodyMd, color: c.primary, flex: 1 },
  }));

  const calloutColors = {
    tip: { bg: colors.primarySoft, fg: colors.primary },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    info: { bg: colors.infoSoft, fg: colors.info },
  };

  const renderImage = (key: HelpImageKey, caption?: string) => {
    const image: HelpImage = helpImages[key];
    return (
      <>
        <Pressable
          onPress={() => setViewerImage({ image: key, caption })}
          accessibilityRole="imagebutton"
          accessibilityLabel={caption ? `Ampliar: ${caption}` : "Ampliar imagen"}
          style={styles.imageFrame}
        >
          <Image
            source={image.source}
            style={{ width: "100%", aspectRatio: image.width / image.height }}
            contentFit="contain"
          />
        </Pressable>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </>
    );
  };

  const renderBlock = (block: HelpBlock, index: number) => {
    switch (block.type) {
      case "p":
        return <RichText key={index} text={block.text} style={styles.paragraph} />;

      case "steps":
        return (
          <View key={index} style={styles.list}>
            {block.items.map((item, i) => (
              <View key={i} style={styles.row}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
                <RichText text={item} style={styles.itemText} />
              </View>
            ))}
          </View>
        );

      case "list":
        return (
          <View key={index} style={styles.list}>
            {block.items.map((item, i) => (
              <View key={i} style={styles.row}>
                <View style={styles.bullet} />
                <RichText text={item} style={styles.itemText} />
              </View>
            ))}
          </View>
        );

      case "image": {
        const image: HelpImage = helpImages[block.image];
        // Una captura de celular se muestra a tamaño de celular aunque la
        // pantalla sea ancha; una de escritorio usa todo el ancho.
        const maxWidth = image.height > image.width ? 300 : 760;
        return (
          <View key={index} style={[styles.imageWrap, { maxWidth }]}>
            {renderImage(block.image, block.caption)}
          </View>
        );
      }

      case "gallery":
        return (
          <ScrollView
            key={index}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.gallery}
          >
            {block.images.map((item) => (
              <View key={item.image} style={styles.galleryItem}>
                {renderImage(item.image, item.caption)}
              </View>
            ))}
          </ScrollView>
        );

      case "callout": {
        const tone = calloutColors[block.tone];
        return (
          <View
            key={index}
            style={[styles.callout, { backgroundColor: tone.bg, borderLeftColor: tone.fg }]}
          >
            <MaterialCommunityIcons name={CALLOUT_ICONS[block.tone]} size={18} color={tone.fg} />
            <RichText text={block.text} style={styles.calloutText} />
          </View>
        );
      }

      case "flow":
        return (
          <View key={index}>
            <View style={styles.flow}>
              {block.items.map((item, i) => (
                <React.Fragment key={item}>
                  {i > 0 && (
                    <MaterialCommunityIcons name="arrow-right" size={14} color={colors.textMuted} />
                  )}
                  <Text style={styles.flowStep}>{item}</Text>
                </React.Fragment>
              ))}
            </View>
            {block.note ? <RichText text={block.note} style={styles.flowNote} /> : null}
          </View>
        );

      case "definitions":
        return (
          <View key={index}>
            {block.items.map((item) => (
              <View key={item.term} style={styles.definition}>
                {item.color ? <View style={[styles.dot, { backgroundColor: item.color }]} /> : null}
                <View style={styles.definitionBody}>
                  <Text style={styles.term}>{item.term}</Text>
                  <RichText text={item.description} style={styles.paragraph} />
                </View>
              </View>
            ))}
          </View>
        );

      case "links":
        return (
          <View key={index} style={styles.list}>
            {block.items.map((link) => (
              <Pressable
                key={link.label}
                onPress={() => onLinkPress(link)}
                style={styles.link}
                accessibilityRole="link"
              >
                <MaterialCommunityIcons
                  name={"route" in link ? "open-in-app" : "book-open-variant"}
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.linkLabel}>{link.label}</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        );
    }
  };

  return (
    <>
      {blocks.map(renderBlock)}
      <HelpImageViewer
        image={viewerImage ? helpImages[viewerImage.image] : null}
        caption={viewerImage?.caption}
        onClose={() => setViewerImage(null)}
      />
    </>
  );
}
