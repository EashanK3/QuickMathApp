import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { T } from "../theme";

export type DrawerDestination = "home" | "profile" | "friendMode";

interface Props {
  visible: boolean;
  onClose: () => void;
  onNavigate: (dest: DrawerDestination) => void;
  current: DrawerDestination;
}

const LINKS: { key: DrawerDestination; label: string; icon: string }[] = [
  { key: "home", label: "Home", icon: "⌂" },
  { key: "profile", label: "Profile", icon: "◈" },
  { key: "friendMode", label: "Friend mode", icon: "⚔" },
];

export default function NavDrawer({ visible, onClose, onNavigate, current }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.panel} onPress={(e) => e.stopPropagation()}>
          <Text style={s.title}>QuickMath</Text>
          {LINKS.map((link) => (
            <Pressable
              key={link.key}
              style={[s.link, current === link.key && s.linkActive]}
              onPress={() => onNavigate(link.key)}
            >
              <Text style={s.linkIcon}>{link.icon}</Text>
              <Text style={[s.linkLabel, current === link.key && s.linkLabelActive]}>{link.label}</Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", flexDirection: "row" },
  panel: {
    width: 260,
    height: "100%",
    backgroundColor: T.surface,
    borderRightWidth: 1,
    borderRightColor: T.border,
    paddingTop: 64,
    paddingHorizontal: 16,
  },
  title: { color: T.text, fontSize: 20, fontWeight: "700", marginBottom: 24, paddingHorizontal: 10 },
  link: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 10, borderRadius: 10 },
  linkActive: { backgroundColor: T.surfaceRaised },
  linkIcon: { color: T.textDim, fontSize: 16, width: 20, textAlign: "center" },
  linkLabel: { color: T.textDim, fontSize: 15 },
  linkLabelActive: { color: T.gold, fontWeight: "600" },
});
