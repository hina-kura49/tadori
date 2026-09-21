import { NestableScrollContainer } from "react-native-draggable-flatlist";
import React, { ReactNode, useState } from "react";
import {
  Platform,
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Route,
  X,
} from "lucide-react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors as c, serif } from "@/lib/theme";
import { Book } from "@/types/domain";
export function Txt({
  children,
  style,
  muted = false,
  serif: editorial = false,
  numberOfLines,
}: {
  children: ReactNode;
  style?: TextStyle;
  muted?: boolean;
  serif?: boolean;
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontSize: 14,
          // Large titles must not inherit the 22pt body line height on iOS.
          lineHeight: Math.max(22, Math.ceil((style?.fontSize ?? 14) * 1.35)),
          color: muted ? c.muted : c.ink,
        },
        editorial && { fontFamily: serif },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Label({ children }: { children: ReactNode }) {
  return (
    <Txt
      style={{
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 2,
        color: c.accent,
      }}
    >
      {children}
    </Txt>
  );
}
export function Row({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[{ flexDirection: "row", alignItems: "center", gap: 12 }, style]}
    >
      {children}
    </View>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  loading = false,
  disabled = false,
  icon = true,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || loading}
      onPress={onPress}
      style={{
        backgroundColor: secondary ? "transparent" : c.accent,
        borderWidth: 1,
        borderColor: secondary ? c.line : c.accent,
        borderRadius: 9,
        minHeight: 52,
        paddingHorizontal: 20,
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Row style={{ justifyContent: "center" }}>
        {loading ? (
          <ActivityIndicator color={secondary ? c.accent : c.white} />
        ) : (
          <>
            <Txt
              style={{
                fontWeight: "600",
                color: secondary ? c.accent : c.white,
              }}
            >
              {title}
            </Txt>
            {icon && (
              <ArrowRight size={17} color={secondary ? c.accent : c.white} />
            )}
          </>
        )}
      </Row>
    </Pressable>
  );
}
export function IconButton({
  onPress,
  label,
  children,
}: {
  onPress: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        opacity: 1,
      }}
    >
      {children}
    </Pressable>
  );
}
export function Chip({
  title,
  selected = false,
  onPress,
}: {
  title: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 24,
        backgroundColor: selected ? c.accent : c.white,
        borderWidth: 1,
        borderColor: selected ? c.accent : c.line,
      }}
    >
      <Txt
        style={{
          fontSize: 12,
          color: selected ? c.white : c.muted,
          fontWeight: selected ? "600" : "400",
        }}
      >
        {title}
      </Txt>
    </Pressable>
  );
}
export function Progress({
  value,
  thin = false,
}: {
  value: number;
  thin?: boolean;
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: value }}
      style={{
        height: thin ? 3 : 5,
        backgroundColor: c.line,
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          height: "100%",
          backgroundColor: c.accent,
          borderRadius: 4,
        }}
      />
    </View>
  );
}
export function Cover({ book, width = 88 }: { book: Book; width?: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <View
      accessibilityLabel={
        book.coverUri
          ? `登録した画像：${book.title}`
          : `表紙未登録：${book.title}`
      }
      style={{
        width,
        height: width * 1.45,
        backgroundColor: "#E5EBE3",
        borderWidth: 1,
        borderColor: "#D2DBD0",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      {book.coverUri && !failed ? (
        <Image
          source={{ uri: book.coverUri }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <View
          style={{
            flex: 1,
            padding: width * 0.12,
            paddingLeft: width * 0.17,
            justifyContent: "space-between",
          }}
        >
          <BookOpen size={Math.max(10, width * 0.16)} color="#8A9C8D" />
          <Text
            numberOfLines={4}
            style={{
              fontSize: Math.max(7, width * 0.135),
              lineHeight: Math.max(10, width * 0.2),
              color: c.accent,
              fontWeight: "500",
            }}
          >
            {book.title}
          </Text>
          <View
            style={{
              width: width * 0.24,
              height: 1,
              backgroundColor: "#9EAE9F",
            }}
          />
        </View>
      )}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: width * 0.055,
          top: 0,
          bottom: 0,
          width: 1,
          backgroundColor: "#BBC9BA",
        }}
      />
    </View>
  );
}
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: c.white,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: 12,
          padding: 20,
          gap: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Screen({
  children,
  refreshing,
  onRefresh,
  back = false,
  title,
  scroll = true,
  nested = false,
  gap = 28,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  back?: boolean;
  title?: string;
  scroll?: boolean;
  nested?: boolean;
  gap?: number;
}) {
  const Container =
    nested && Platform.OS !== "web" ? NestableScrollContainer : ScrollView;
  const content = (
    <View
      style={{
        width: "100%",
        maxWidth: 720,
        alignSelf: "center",
        paddingHorizontal: 24,
        paddingTop: back ? 8 : 20,
        paddingBottom: 36,
        gap,
      }}
    >
      {children}
    </View>
  );
  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-paper">
      {back && (
        <Row
          style={{
            paddingHorizontal: 12,
            paddingTop: 4,
            paddingBottom: 6,
            borderBottomWidth: 1,
            borderColor: c.line,
          }}
        >
          <IconButton
            label="戻る"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/")
            }
          >
            <ArrowLeft color={c.ink} size={20} />
          </IconButton>
          <Txt style={{ fontSize: 12, fontWeight: "600", letterSpacing: 1 }}>
            {title ?? "TADORI"}
          </Txt>
        </Row>
      )}
      {scroll ? (
        <Container
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={c.accent}
              />
            ) : undefined
          }
        >
          {content}
        </Container>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <View style={{ gap: 10 }}>
      {eyebrow && <Label>{eyebrow}</Label>}
      <Txt serif style={{ fontSize: 38, lineHeight: 44, letterSpacing: -1 }}>
        {title}
      </Txt>
      {description && (
        <Txt muted style={{ lineHeight: 24 }}>
          {description}
        </Txt>
      )}
    </View>
  );
}
export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Txt style={{ fontSize: 12, fontWeight: "600" }}>{label}</Txt>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#9A9A96"
        {...props}
        style={[
          {
            backgroundColor: c.white,
            borderWidth: 1,
            borderColor: error ? c.error : c.line,
            borderRadius: 8,
            paddingHorizontal: 14,
            paddingVertical: 13,
            fontSize: 15,
            color: c.ink,
            minHeight: 48,
          },
          props.multiline && { minHeight: 90, textAlignVertical: "top" },
          props.style,
        ]}
      />
      {error && <Txt style={{ color: c.error, fontSize: 12 }}>{error}</Txt>}
    </View>
  );
}
export function ErrorMessage({ error }: { error: unknown }) {
  return error ? (
    <Txt style={{ color: c.error, fontSize: 13 }}>
      {error instanceof Error
        ? error.message
        : "エラーが発生しました。再度お試しください。"}
    </Txt>
  ) : null;
}
export function Empty({
  title,
  description,
  action,
  onPress,
}: {
  title: string;
  description: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={{ paddingVertical: 32, gap: 16, alignItems: "center" }}>
      <View style={{ padding: 20, backgroundColor: c.wash, borderRadius: 50 }}>
        <Route color={c.accent} size={30} />
      </View>
      <Txt serif style={{ fontSize: 24, textAlign: "center" }}>
        {title}
      </Txt>
      <Txt muted style={{ textAlign: "center", lineHeight: 25 }}>
        {description}
      </Txt>
      {action && onPress && <Button title={action} onPress={onPress} />}
    </View>
  );
}
export function Loading() {
  return (
    <Screen>
      <View accessibilityLabel="読み込み中" style={{ gap: 22, paddingTop: 30 }}>
        {[120, 240, 80].map((h, i) => (
          <View
            key={i}
            style={{
              height: h,
              backgroundColor: "#ECEEE9",
              borderRadius: 12,
              opacity: 1 - i * 0.15,
            }}
          />
        ))}
      </View>
    </Screen>
  );
}
export function DataError({ retry }: { retry: () => void }) {
  return (
    <Screen>
      <Empty
        title="道の途中で、ひと休み。"
        description="データを読み込めませんでした。接続を確認して、もう一度お試しください。"
        action="再読み込み"
        onPress={retry}
      />
    </Screen>
  );
}
export function Avatar({
  name,
  size = 32,
  uri,
}: {
  name: string;
  size?: number;
  uri?: string;
}) {
  if (uri)
    return (
      <Image
        source={{ uri }}
        accessibilityLabel={`${name}のアイコン`}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: c.wash,
        }}
      />
    );
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.wash,
        borderWidth: 2,
        borderColor: c.paper,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Txt
        serif
        style={{ color: c.accent, fontSize: size * 0.4, fontWeight: "600" }}
      >
        {name.slice(0, 1).toUpperCase()}
      </Txt>
    </View>
  );
}
export function Separator() {
  return <View style={{ height: 1, backgroundColor: c.line }} />;
}
