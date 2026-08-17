export interface Paragraph {
  id: string;
  text: string;
}

export interface Chapter {
  id: string;
  title: string;
  size: 'xl' | 'l' | 'm';
  /** Узел Figma с фотографией карточки в оглавлении. */
  image?: string;
}

/** Крупная белая подпись, лежащая поверх фотографии. */
export interface Caption {
  text: string;
  size: 'xl' | 'l' | 'm' | 'quote' | 'quote-s';
  /** Узел Figma с кадром, на котором лежит подпись. */
  imageId: string;
}

export interface Block {
  id: string;
  figmaId: string;
  kind: 'hero' | 'intro' | 'nav' | 'chapter' | 'quote' | 'body' | 'outro';
  title?: string;
  titleSize?: 'xl' | 'l' | 'm' | 'quote' | 'quote-s';
  caption?: Caption;
  paragraphs: Paragraph[];
  images: string[];
}

export interface Landing {
  title: string;
  chapters: Chapter[];
  blocks: Block[];
}
