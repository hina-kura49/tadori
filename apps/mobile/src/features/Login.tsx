import { useState } from "react";
import { Pressable } from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  ErrorMessage,
  Field,
  PageTitle,
  Screen,
  Txt,
} from "@/components/ui";
import { dataKey } from "@/hooks/useTadori";
import { signIn, signUp } from "@/lib/auth";
import { colors as c } from "@/lib/theme";

// 開発用のメール + パスワードログイン。本番の画面は Apple / Google のみにする想定で、
// その 2 つは API 側の受け口 (POST /api/auth/sign-in/social) まで用意済み。
// ネイティブ SDK を入れたら、GET /api/auth/methods の結果でボタンを出し分ける。
export default function Login() {
  const client = useQueryClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isSignUp = mode === "signup";

  const submit = useMutation({
    mutationFn: () =>
      isSignUp
        ? signUp(name.trim(), email.trim(), password)
        : signIn(email.trim(), password),
    onSuccess: async () => {
      // 前のユーザーのデータを残さない。登録直後は _layout が onboarding へ誘導する
      await client.resetQueries({ queryKey: dataKey });
      router.replace("/");
    },
  });
  const ready =
    email.includes("@") && password.length >= 8 && (!isSignUp || !!name.trim());

  return (
    <Screen>
      <PageTitle
        eyebrow="TADORI"
        title={isSignUp ? "Start your path." : "Welcome back."}
        description="誰かが作った学びの道を、辿る。"
      />
      {isSignUp && (
        <Field
          label="Name"
          value={name}
          onChangeText={setName}
          maxLength={80}
          autoComplete="name"
        />
      )}
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
      />
      <Field
        label="Password（8文字以上）"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete={isSignUp ? "new-password" : "current-password"}
      />
      <ErrorMessage error={submit.error} />
      <Button
        title={isSignUp ? "アカウントを作成" : "ログイン"}
        loading={submit.isPending}
        disabled={!ready}
        onPress={() => submit.mutate()}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          submit.reset();
          setMode(isSignUp ? "signin" : "signup");
        }}
      >
        <Txt style={{ color: c.accent, fontSize: 13, textAlign: "center" }}>
          {isSignUp
            ? "すでにアカウントをお持ちの方はログイン"
            : "はじめての方はアカウントを作成"}
        </Txt>
      </Pressable>
    </Screen>
  );
}
