import sys
import os

def process_file(filename):
    print("Starting file processing for", filename)
    
    try:
        f = open(filename, 'r')
        data = f.read()
        f.close()
        
        print("Successfully read %d bytes" % len(data))
        return data
        
    except IOError as e:
        print("Error reading file:", e)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        process_file(sys.argv[1])
    else:
        print("Please provide a filename")
