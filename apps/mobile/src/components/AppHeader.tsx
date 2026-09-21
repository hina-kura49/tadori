import type { ReactNode } from "react";
import { View } from "react-native";
import { Row, Txt } from "./ui";

/** Shared navigation heading for the five main tabs. */
export function AppHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Row style={{ minHeight: 44, justifyContent: "space-between", gap: 16 }}>
        <Txt
          serif
          style={{
            fontSize: 28,
            lineHeight: 38,
            fontWeight: "400",
            letterSpacing: -0.5,
            flex: 1,
          }}
        >
          {title}
        </Txt>
        {action}
      </Row>
      {description && (
        <Txt muted style={{ fontSize: 13, lineHeight: 21 }}>
          {description}
        </Txt>
      )}
    </View>
  );
}
