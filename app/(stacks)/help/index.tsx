import EmptyState from "@/components/App/EmptyState";
import SearchInput from "@/components/App/SearchInput";
import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { buildHelpSearchIndex, HELP_TOPICS, openHelp, type HelpTopic } from "@/help";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import Fuse from "fuse.js";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

// Guías que ya existían como pantallas propias (cargan datos del API, por eso
// no son un tema de bloques).
const OTHER_GUIDES = [
  {
    title: "Tareas y notificaciones",
    summary: "Qué genera cada tarea y aviso, y a quién le llega.",
    icon: "bell-cog-outline" as const,
    route: "/(stacks)/task-notification-guide",
  },
];

/** Centro de ayuda: buscador y lista de guías por módulo. */
export default function HelpCenterScreen() {
  const { colors } = useTheme();
  const { hasPermission } = useAuth();
  const [query, setQuery] = useState("");

  // Solo los módulos a los que el usuario tiene acceso.
  const topics = useMemo(
    () =>
      HELP_TOPICS.filter((topic) => {
        if (!topic.permission) return true;
        const required = Array.isArray(topic.permission) ? topic.permission : [topic.permission];
        return required.some(hasPermission);
      }),
    [hasPermission],
  );

  const fuse = useMemo(
    () =>
      new Fuse(buildHelpSearchIndex(topics), {
        keys: [
          { name: "sectionTitle", weight: 0.5 },
          { name: "topicTitle", weight: 0.2 },
          { name: "text", weight: 0.3 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [topics],
  );

  const results = useMemo(
    () => (query.trim() ? fuse.search(query.trim()).slice(0, 20) : []),
    [fuse, query],
  );

  const groups = useMemo(() => {
    const byGroup = new Map<string, HelpTopic[]>();
    topics.forEach((topic) => {
      byGroup.set(topic.group, [...(byGroup.get(topic.group) ?? []), topic]);
    });
    return [...byGroup.entries()];
  }, [topics]);

  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.background },
    content: {
      width: "100%",
      maxWidth: 880,
      alignSelf: "center",
      padding: 16,
      paddingBottom: 48,
      gap: 20,
    },
    intro: { gap: 4 },
    title: { ...tokens.typography.h1, color: c.text },
    subtitle: { ...tokens.typography.body, color: c.textSecondary },
    group: { gap: 10 },
    groupLabel: { ...tokens.typography.micro, color: c.textMuted, textTransform: "uppercase" },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    card: {
      flexGrow: 1,
      flexBasis: 260,
      flexDirection: "row",
      gap: 12,
      padding: 14,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    cardIcon: {
      width: 40,
      height: 40,
      borderRadius: tokens.radius.md,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    cardBody: { flex: 1, gap: 2 },
    cardTitle: { ...tokens.typography.bodyMd, fontWeight: "700", color: c.text },
    cardText: { ...tokens.typography.bodySm, color: c.textSecondary },
    cardMeta: { ...tokens.typography.caption, color: c.textMuted, marginTop: 4 },
    result: {
      gap: 2,
      padding: 14,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    resultTopic: { ...tokens.typography.caption, color: c.textMuted },
    resultTitle: { ...tokens.typography.bodyMd, fontWeight: "600", color: c.text },
    resultText: { ...tokens.typography.bodySm, color: c.textSecondary },
  }));

  const renderCard = (
    key: string,
    icon: HelpTopic["icon"],
    title: string,
    summary: string,
    onPress: () => void,
    meta?: string,
  ) => (
    <Pressable key={key} style={styles.card} onPress={onPress} accessibilityRole="button">
      <View style={styles.cardIcon}>
        <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardText}>{summary}</Text>
        {meta ? <Text style={styles.cardMeta}>{meta}</Text> : null}
      </View>
    </Pressable>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.intro}>
        <Text style={styles.title}>Centro de ayuda</Text>
        <Text style={styles.subtitle}>
          Guías paso a paso de cada módulo. También puedes abrir la de la pantalla en la que
          estás con el botón de ayuda de la barra superior.
        </Text>
      </View>

      <SearchInput
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar en la ayuda…"
        width="100%"
        showShortcut={false}
      />

      {query.trim() ? (
        results.length > 0 ? (
          <View style={styles.group}>
            {results.map(({ item }) => (
              <Pressable
                key={`${item.topicId}-${item.sectionId}`}
                style={styles.result}
                onPress={() => openHelp(item.topicId, item.sectionId)}
              >
                <Text style={styles.resultTopic}>{item.topicTitle}</Text>
                <Text style={styles.resultTitle}>{item.sectionTitle}</Text>
                <Text style={styles.resultText} numberOfLines={2}>
                  {item.text}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyState
            icon="text-search"
            title="Sin resultados"
            description="Prueba con otra palabra, por ejemplo el nombre del módulo o de un botón."
            compact
          />
        )
      ) : (
        <>
          {groups.map(([group, groupTopics]) => (
            <View key={group} style={styles.group}>
              <Text style={styles.groupLabel}>{group}</Text>
              <View style={styles.grid}>
                {groupTopics.map((topic) =>
                  renderCard(
                    topic.id,
                    topic.icon,
                    topic.title,
                    topic.summary,
                    () => openHelp(topic.id),
                    `${topic.sections.length} secciones`,
                  ),
                )}
              </View>
            </View>
          ))}

          <View style={styles.group}>
            <Text style={styles.groupLabel}>Otras guías</Text>
            <View style={styles.grid}>
              {OTHER_GUIDES.map((guide) =>
                renderCard(guide.route, guide.icon, guide.title, guide.summary, () =>
                  router.push(guide.route as any),
                ),
              )}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}
