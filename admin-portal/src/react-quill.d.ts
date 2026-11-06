declare module 'react-quill' {
  import * as React from 'react';
  export const Quill: any;
  export interface ReactQuillProps {
    theme?: string;
    modules?: Record<string, unknown>;
    value?: string;
    onChange?: (html: string) => void;
    placeholder?: string;
    [key: string]: unknown;
  }
  export default class ReactQuill extends React.Component<ReactQuillProps> {
    getEditor(): any;
  }
}
