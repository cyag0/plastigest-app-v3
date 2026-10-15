import EmptyState from "@/components/App/EmptyState";
import HelpBlocks from "@/components/Help/HelpBlocks";
import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getHelpTopic, helpHref, type HelpLink } from "@/help";
import { useResponsive } from "@/hooks/useResponsive";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

/**
 * Artículo de ayuda de un módulo. Con `?section=<id>` abre directo en esa
 * sección y la resalta un momento (así llega el botón de ayuda del AppBar).
 */
export default function HelpTopicScreen() {
  const { topic: topicId, section } = useLocalSearchParams<{
    topic: string;
    section?: string;
  }>();
  const topic = getHelpTopic(topicId);
  const { colors } = useTheme();
  const { hasPermission } = useAuth();
  const { isLg, isXl } = useResponsive();
  const wide = isLg || isXl;

  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  // Sección a la que falta llevar el scroll: se resuelve en cuanto se mide.
  const pendingScroll = useRef<string | undefined>(section);
  const [highlighted, setHighlighted] = useState<string | undefined>(section);
  // Al cambiar la sección de la URL se vuelve a resaltar (ajuste en render,
  // no en un efecto, para no pintar dos veces).
  const [lastSection, setLastSection] = useState(section);
  if (section !== lastSection) {
    setLastSection(section);
    setHighlighted(section);
  }

  const scrollTo = useCallback((id: string, animated: boolean) => {
    const y = offsets.current[id];
    if (y === undefined) return false;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated });
    return true;
  }, []);

  useEffect(() => {
    if (!section) return;
    pendingScroll.current = scrollTo(section, true) ? undefined : section;
  }, [section, scrollTo]);

  useEffect(() => {
    if (!highlighted) return;
    const timer = setTimeout(() => setHighlighted(undefined), 2500);
    return () => clearTimeout(timer);
  }, [highlighted]);

  const onSectionLayout = (id: string) => (event: LayoutChangeEvent) => {
    offsets.current[id] = event.nativeEvent.layout.y;
    if (pendingScroll.current === id) {
      pendingScroll.current = undefined;
      // Un frame después, para que el ScrollView ya tenga el alto final.
      requestAnimationFrame(() => scrollTo(id, false));
    }
  };

  const goToSection = (id: string) => {
    // Pasa por la URL para que el enlace se pueda compartir en web.
    if (id === section) {
      scrollTo(id, true);
      setHighlighted(id);
    } else {
      router.setParams({ section: id });
    }
  };

  const onLinkPress = (link: HelpLink) => {
    if ("route" in link) {
      router.push(link.route as any);
    } else if (link.topic === topic?.id && link.section) {
      goToSection(link.section);
    } else {
      router.push(helpHref(link.topic, link.section));
    }
  };

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background },
    body: { flex: 1, flexDirection: "row" },
    toc: {
      width: 240,
      paddingTop: 24,
      paddingHorizontal: 16,
      borderRightWidth: 1,
      borderRightColor: c.border,
      gap: 2,
    },
    tocLabel: {
      ...tokens.typography.micro,
      color: c.textMuted,
      textTransform: "uppercase",
      marginBottom: 6,
      paddingHorizontal: 8,
    },
    tocItem: { paddingVertical: 7, paddingHorizontal: 8, borderRadius: tokens.radius.sm },
    tocItemActive: { backgroundColor: c.primarySoft },
    tocItemText: { ...tokens.typography.body, color: c.textSecondary },
    tocItemTextActive: { color: c.primary, fontWeight: "600" },
    scroll: { flex: 1 },
    content: {
      width: "100%",
      maxWidth: 760,
      alignSelf: "center",
      padding: 16,
      paddingBottom: 48,
      gap: 16,
    },
    header: { flexDirection: "row", gap: 14, alignItems: "flex-start", paddingTop: 8 },
    headerIcon: {
      width: 48,
      height: 48,
      borderRadius: tokens.radius.md,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    headerText: { flex: 1, gap: 4 },
    title: { ...tokens.typography.h1, color: c.text },
    summary: { ...tokens.typography.body, color: c.textSecondary, lineHeight: 21 },
    moduleButton: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 6,
      marginTop: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: tokens.radius.sm,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    moduleButtonText: { ...tokens.typography.bodyMd, color: c.primary },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    chip: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: tokens.radius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    chipText: { ...tokens.typography.bodySm, color: c.textSecondary },
    section: {
      gap: 12,
      padding: 16,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    sectionHighlighted: { borderColor: c.primary, backgroundColor: c.primarySoft },
    sectionTitle: { ...tokens.typography.h2, color: c.text },
    footer: { alignItems: "center", paddingTop: 8 },
    footerLink: { ...tokens.typography.bodyMd, color: c.primary },
  }));

  if (!topic) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Ayuda" }} />
        <EmptyState
          icon="book-off-outline"
          title="No encontramos esta guía"
          description="Puede que se haya movido o que el enlace esté incompleto."
          actionLabel="Ir al centro de ayuda"
          onAction={() => router.replace("/(stacks)/help" as any)}
        />
      </View>
    );
  }

  const permissions = topic.permission
    ? Array.isArray(topic.permission) ? topic.permission : [topic.permission]
    : [];
  const canOpenModule =
    !!topic.moduleRoute && (permissions.length === 0 || permissions.some(hasPermission));

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: topic.title }} />
      <View style={styles.body}>
        {wide && (
          <View style={styles.toc}>
            <Text style={styles.tocLabel}>En esta guía</Text>
            {topic.sections.map((s) => {
              const active = s.id === (highlighted ?? section);
              return (
                <Pressable
                  key={s.id}
                  onPress={() => goToSection(s.id)}
                  style={[styles.tocItem, active && styles.tocItemActive]}
                >
                  <Text style={[styles.tocItemText, active && styles.tocItemTextActive]}>
                    {s.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons name={topic.icon} size={26} color={colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{topic.title}</Text>
              <Text style={styles.summary}>{topic.summary}</Text>
              {canOpenModule && (
                <Pressable
                  onPress={() => router.push(topic.moduleRoute as any)}
                  style={styles.moduleButton}
                >
                  <Text style={styles.moduleButtonText}>Ir a {topic.title}</Text>
                  <MaterialCommunityIcons name="arrow-right" size={16} color={colors.primary} />
                </Pressable>
              )}
            </View>
          </View>

          {!wide && (
            <View style={styles.chips}>
              {topic.sections.map((s) => (
                <Pressable key={s.id} onPress={() => goToSection(s.id)} style={styles.chip}>
                  <Text style={styles.chipText}>{s.title}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {topic.sections.map((s) => (
            <View
              key={s.id}
              onLayout={onSectionLayout(s.id)}
              style={[styles.section, highlighted === s.id && styles.sectionHighlighted]}
              testID={`help-section-${s.id}`}
            >
              <Text style={styles.sectionTitle}>{s.title}</Text>
              <HelpBlocks blocks={s.blocks} onLinkPress={onLinkPress} />
            </View>
          ))}

          <View style={styles.footer}>
            <Pressable onPress={() => router.push("/(stacks)/help" as any)}>
              <Text style={styles.footerLink}>Ver todas las guías</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
