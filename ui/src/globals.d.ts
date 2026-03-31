/// <reference types="@rsbuild/core/types" />

declare module "*.md" {
  const content: string;
  export default content;
}
