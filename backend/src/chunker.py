import re
from typing import List, Dict, Any

class ContractChunker:
    """
    Cleans contract text and splits it into semantic chunks with overlapping boundaries.
    """
    def __init__(self, chunk_size: int = 2000, chunk_overlap: int = 200):
        """
        Args:
            chunk_size: Target size of each chunk in characters.
            chunk_overlap: Overlap size between consecutive chunks in characters.
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def clean_text(self, text: str) -> str:
        """
        Normalizes whitespaces, removes duplicate empty lines,
        but preserves logical line breaks (such as sections).
        """
        if not text:
            return ""
        
        # Replace carriage returns
        text = text.replace("\r", "\n")
        
        # Replace multiple consecutive spaces with a single space
        text = re.sub(r"[ \t]+", " ", text)
        
        # Replace multiple consecutive newlines (3 or more) with double newlines
        text = re.sub(r"\n{3,}", "\n\n", text)
        
        return text.strip()

    def split_text(self, text: str) -> List[Dict[str, Any]]:
        """
        Splits text into chunks recursively, attempting to split on paragraphs first,
        then sentences, then words, to keep paragraphs and sentences whole.
        
        Returns:
            A list of dicts: [{"text": chunk_text, "start_idx": int, "end_idx": int}]
        """
        cleaned_text = self.clean_text(text)
        if not cleaned_text:
            return []

        chunks = []
        text_len = len(cleaned_text)
        start = 0

        while start < text_len:
            # Determine initial end index
            end = min(start + self.chunk_size, text_len)
            
            # If we are not at the end of the text, try to find a logical split point
            if end < text_len:
                # 1. Try to split on double newline (paragraph boundary)
                boundary = cleaned_text.rfind("\n\n", start + self.chunk_overlap, end)
                if boundary != -1:
                    end = boundary + 2
                else:
                    # 2. Try to split on single newline
                    boundary = cleaned_text.rfind("\n", start + self.chunk_overlap, end)
                    if boundary != -1:
                        end = boundary + 1
                    else:
                        # 3. Try to split on sentence boundary (. followed by space/newline)
                        sentence_boundary = -1
                        for match in re.finditer(r"\.\s", cleaned_text[start + self.chunk_overlap:end]):
                            sentence_boundary = start + self.chunk_overlap + match.start() + 1
                        
                        if sentence_boundary != -1:
                            end = sentence_boundary
                        else:
                            # 4. Try to split on space (word boundary)
                            space_boundary = cleaned_text.rfind(" ", start + self.chunk_overlap, end)
                            if space_boundary != -1:
                                end = space_boundary + 1

            chunk_text = cleaned_text[start:end].strip()
            if chunk_text:
                chunks.append({
                    "text": chunk_text,
                    "start_idx": start,
                    "end_idx": end
                })

            if end >= text_len:
                break

            # Advance start pointer, subtracting overlap
            start = max(end - self.chunk_overlap, start + 1)
            
            # Prevent infinite loop if end didn't advance
            if start >= end:
                start = end

        return chunks

    def split_text_parent_child(self, text: str, child_size: int = 400, child_overlap: int = 50) -> List[Dict[str, Any]]:
        """
        Splits text into parent chunks using self.chunk_size and self.chunk_overlap.
        Then, for each parent chunk, splits it into child chunks.
        
        Returns:
            A list of dicts representing child chunks:
            [{
                "text": child_text,
                "start_idx": child_start,
                "end_idx": child_end,
                "parent_text": parent_text,
                "parent_start_idx": parent_start,
                "parent_end_idx": parent_end
            }]
        """
        parent_chunks = self.split_text(text)
        child_chunks = []
        
        # Helper chunker for child segments
        child_chunker = ContractChunker(chunk_size=child_size, chunk_overlap=child_overlap)
        
        for p_chunk in parent_chunks:
            p_text = p_chunk["text"]
            p_children = child_chunker.split_text(p_text)
            for c_chunk in p_children:
                child_chunks.append({
                    "text": c_chunk["text"],
                    "start_idx": p_chunk["start_idx"] + c_chunk["start_idx"],
                    "end_idx": p_chunk["start_idx"] + c_chunk["end_idx"],
                    "parent_text": p_text,
                    "parent_start_idx": p_chunk["start_idx"],
                    "parent_end_idx": p_chunk["end_idx"]
                })
        return child_chunks

# Example usage for testing
if __name__ == "__main__":
    test_text = (
        "1. GOVERNING LAW AND JURISDICTION.\n"
        "This Agreement shall be governed by, and construed in accordance with, "
        "the laws of the State of Delaware, without regard to its conflict of laws principles. "
        "Each party consents to the jurisdiction of the Delaware courts.\n\n"
        "2. TERM AND TERMINATION.\n"
        "This Agreement shall commence on the Effective Date and remain in effect for "
        "a period of one (1) year. Either party may terminate this Agreement for convenience "
        "upon thirty (30) days prior written notice."
    )
    
    chunker = ContractChunker(chunk_size=150, chunk_overlap=20)
    chunks = chunker.split_text(test_text)
    
    print(f"Generated {len(chunks)} chunks:")
    for i, c in enumerate(chunks):
        print(f"--- Chunk {i+1} (Chars {c['start_idx']}-{c['end_idx']}) ---")
        print(c["text"])
