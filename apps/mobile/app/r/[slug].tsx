import { Redirect, useLocalSearchParams } from "expo-router";
export default function SharedRoadmap() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <Redirect href={{ pathname: "/roadmaps/[slug]", params: { slug } }} />;
}
