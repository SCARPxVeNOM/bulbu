import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Bulbu } from "@/components/bulbu/Bulbu";
import { Btn, Field, Header, Input, Row, Screen } from "@/components/ui";
import { T } from "@/theme";

export default function SignUp() {
  const [name, setName] = useState("");
  const [step, setStep] = useState<"methods" | "name">("methods");
  const next = () => { if (name.trim()) router.push({ pathname: "/setup", params: { name: name.trim() } }); };
  return (
    <Screen>
      <Header back="/welcome" />
      <Row style={{ alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text style={T.titleXL}>Create{"\n"}your space</Text>
          <Text style={[T.muted, { marginTop: 14 }]}>Let's set up Bulbu to understand you better.</Text>
        </View>
        <Bulbu emote="focused" outfit={null} view="close" background="#EAF0FF" style={{ width: 140, height: 160, borderRadius: 28 }} />
      </Row>
      {step === "methods" ? (
        <View style={{ gap: 12, marginTop: 10 }}>
          <Btn kind="ghost" title="Continue with Google" onPress={() => setStep("name")} />
          <Btn kind="ghost" title="Continue with Apple" onPress={() => setStep("name")} />
          <Row style={{ marginVertical: 6 }}><View style={{ flex: 1, height: 1, backgroundColor: "#DDE3F3" }} /><Text style={T.small}>or</Text><View style={{ flex: 1, height: 1, backgroundColor: "#DDE3F3" }} /></Row>
          <Btn kind="ghost" icon="mail" title="Continue with Email" onPress={() => setStep("name")} />
          <Text style={[T.small, { textAlign: "center", marginTop: 20 }]}>Sign-in with Google and Apple is coming. For now your profile lives on your Bulbu server.</Text>
        </View>
      ) : (
        <View style={{ gap: 14, marginTop: 10 }}>
          <Field label="What should Bulbu call you?">
            <Input autoFocus value={name} onChangeText={setName} placeholder="Your first name" maxLength={40} returnKeyType="next" onSubmitEditing={next} />
          </Field>
          <Btn title="Continue" icon="arrow" disabled={!name.trim()} onPress={next} />
        </View>
      )}
    </Screen>
  );
}
