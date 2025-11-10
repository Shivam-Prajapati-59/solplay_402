"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import {
    Type,
    Hash,
    Plus,
    X,
    FileText,
    Video,
    Upload,
    Image,
    DollarSign,
} from "lucide-react";
import z from "zod";
import lighthouse from "@lighthouse-web3/sdk";
import { useWallet } from "@solana/wallet-adapter-react";
import { createNewVideo } from "@/data/videos";
import { createOrGetUser } from "@/data/user.api";

// Form validation schema
const formSchema = z.object({
    title: z
        .string()
        .min(1, "Title is required")
        .max(100, "Title must be less than 100 characters"),
    description: z
        .string()
        .min(1, "Description is required")
        .max(500, "Description must be less than 500 characters"),
    thumbnail: z
        .string()
        .url("Must be a valid URL")
        .optional()
        .or(z.literal("")),
    price: z
        .string()
        .min(1, "Price is required")
        .refine((val) => {
            const priceRegex = /^\$?\d+(\.\d{1,2})?$/;
            return priceRegex.test(val);
        }, "Price must be a valid amount (e.g., 0.01 or $0.01)"),
    tags: z.string().refine((val) => {
        if (!val || val.trim().length === 0) return true;
        const tags = val.split(/[,\s]+/).filter((tag) => tag.trim().length > 0);
        return tags.every((tag) => tag.startsWith("#") && tag.length > 1);
    }, "Tags must start with # and be separated by commas or spaces (e.g., #gaming, #tutorial)"),
    video: z
        .any()
        .refine((files) => files?.length == 1, "Video file is required.")
        .refine(
            (files) => files?.[0]?.type.startsWith("video/"),
            "Only video files are allowed"
        )
        .refine(
            (files) => files?.[0]?.size <= 100 * 1024 * 1024,
            "File too large. Maximum size is 100MB"
        ),
});

type FormData = z.infer<typeof formSchema>;

const VideoForm = () => {
    const [tags, setTags] = React.useState<string[]>([]);
    const [currentTag, setCurrentTag] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const { publicKey, connected } = useWallet();

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            thumbnail: "",
            price: "0.01",
            tags: "",
        },
    });

    React.useEffect(() => {
        form.setValue("tags", tags.join(" "));
    }, [tags, form]);

    const addTag = () => {
        if (currentTag.trim() && !tags.includes(currentTag.trim())) {
            const newTag = currentTag.trim().startsWith("#")
                ? currentTag.trim()
                : `#${currentTag.trim()}`;
            setTags([...tags, newTag]);
            setCurrentTag("");
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter((tag) => tag !== tagToRemove));
    };

    const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addTag();
        }
    };

    const apiKey = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY || "";

    const uploadFile = async (fileList: FileList) => {
        if (!fileList || fileList.length === 0) {
            console.error("No file selected.");
            toast.error("No file selected");
            return null;
        }

        if (!connected || !publicKey) {
            toast.error("Wallet not connected", {
                description: "Please connect your Solana wallet to upload files.",
            });
            return null;
        }

        if (!apiKey) {
            toast.error("API Key not configured", {
                description: "Lighthouse API key is missing. Please configure NEXT_PUBLIC_LIGHTHOUSE_API_KEY in .env.local",
            });
            console.error("Lighthouse API key is not configured");
            return null;
        }

        try {
            toast.info("Uploading file...", {
                description: "Your video is being uploaded to IPFS.",
            });

            const output = await lighthouse.upload(fileList, apiKey);

            console.log("File Upload Status:", output);

            if (!output || !output.data || !output.data.Hash) {
                throw new Error("Invalid response from Lighthouse: " + JSON.stringify(output));
            }

            const fileHash = output.data.Hash;

            if (!fileHash) {
                throw new Error("No file hash returned from Lighthouse");
            }

            console.log(`File uploaded successfully. Hash: ${fileHash}`);
            console.log(`View at https://gateway.lighthouse.storage/ipfs/${fileHash}`);

            toast.success("Upload complete!", {
                description: "Your video has been uploaded to IPFS successfully.",
            });

            return fileHash;
        } catch (error: any) {
            console.error("Error uploading file:", error);

            let errorMessage = "There was an error uploading your file. Please try again.";

            if (error?.message?.includes("Authentication failed") || error?.response?.status === 401) {
                errorMessage = "Authentication failed. Please check your API key.";
            } else if (error?.message) {
                errorMessage = error.message;
            }

            toast.error("Upload failed", {
                description: errorMessage,
            });
            return null;
        }
    };

    const onSubmit = async (data: FormData) => {
        if (!connected || !publicKey) {
            toast.error("Wallet not connected", {
                description: "Please connect your Solana wallet before uploading.",
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const videoFile = data.video?.[0];

            if (!videoFile) {
                toast.error("No video file selected");
                setIsSubmitting(false);
                return;
            }

            const fileList = data.video as FileList;
            const fileHash = await uploadFile(fileList);

            if (!fileHash) {
                throw new Error("File upload failed");
            }

            toast.info("Saving video metadata...", {
                description: "Creating video entry in database.",
            });

            const formattedPrice = data.price.startsWith("$")
                ? data.price
                : `$${data.price}`;

            const videoData = {
                title: data.title,
                description: data.description,
                tags: tags,
                pubkey: publicKey.toBase58(),
                CID: fileHash,
                thumbnail: data.thumbnail || undefined,
                price: formattedPrice,
            };

            console.log("Submitting video data to database:", videoData);

            const result = await createNewVideo(videoData);

            console.log("Database response:", result);

            if (!result.success) {
                throw new Error(result.error || "Failed to save video metadata");
            }

            console.log("Video created successfully:", result.video);

            toast.success("Video uploaded successfully!", {
                description: `"${data.title}" has been uploaded to IPFS and saved to database.`,
                duration: 5000,
            });

            form.reset();
            setTags([]);
            setCurrentTag("");

            const fileInput = document.getElementById(
                "video-upload"
            ) as HTMLInputElement;
            if (fileInput) {
                fileInput.value = "";
            }
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("Submission failed!", {
                description: "There was an error submitting your form. Please try again.",
                duration: 3000,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const watchedVideo = form.watch("video");
    const selectedFileName = watchedVideo?.[0]?.name || "";

    return (
        <div className="w-full max-w-4xl mx-auto p-6">
            <div className="space-y-6">
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight">Video Information</h2>
                    <p className="text-muted-foreground">
                        Fill out the form below with your video details.
                    </p>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Grid Layout for Form Fields - 3 fields on each side */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column: Title, Description, Thumbnail */}
                            <div className="space-y-4">
                                {/* Video Title */}
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Type className="h-4 w-4" />
                                                Video Title
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter an engaging title for your video"
                                                    {...field}
                                                    disabled={isSubmitting}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Choose a clear and descriptive title that represents
                                                your video content.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Video Description */}
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <FileText className="h-4 w-4" />
                                                Description
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Describe your video content, what viewers can expect to see..."
                                                    className="min-h-[120px] resize-none"
                                                    {...field}
                                                    disabled={isSubmitting}
                                                />
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                Provide a detailed description to help viewers
                                                understand your content.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Thumbnail URL */}
                                <FormField
                                    control={form.control}
                                    name="thumbnail"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Image className="h-4 w-4" />
                                                Thumbnail URL
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="https://..."
                                                    {...field}
                                                    disabled={isSubmitting}
                                                />
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                Optional thumbnail image URL
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Right Column: Price, Tags, Video Upload */}
                            <div className="space-y-4">
                                {/* Price */}
                                <FormField
                                    control={form.control}
                                    name="price"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <DollarSign className="h-4 w-4" />
                                                Price (USDC)
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="0.01"
                                                    {...field}
                                                    disabled={isSubmitting}
                                                />
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                Access price (e.g., 0.01)
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Tags */}
                                <FormField
                                    control={form.control}
                                    name="tags"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Hash className="h-4 w-4" />
                                                Tags (Optional)
                                            </FormLabel>
                                            <FormControl>
                                                <div className="space-y-2">
                                                    {/* Tag input with plus button */}
                                                    <div className="flex gap-2">
                                                        <Input
                                                            placeholder="Add a hashtag..."
                                                            value={currentTag}
                                                            onChange={(e) => setCurrentTag(e.target.value)}
                                                            onKeyPress={handleTagInputKeyPress}
                                                            disabled={isSubmitting}
                                                            className="flex-1"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={addTag}
                                                            disabled={
                                                                !currentTag.trim() || isSubmitting
                                                            }
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                    </div>

                                                    {/* Display added tags */}
                                                    {tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {tags.map((tag, index) => (
                                                                <div
                                                                    key={index}
                                                                    className="flex items-center gap-1 bg-primary/20 text-primary px-2 py-1 rounded-lg text-xs dark:text-white/90"
                                                                >
                                                                    <span>{tag}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeTag(tag)}
                                                                        disabled={isSubmitting}
                                                                        className="hover:bg-primary/20 rounded-full p-1 transition-colors"
                                                                    >
                                                                        <X className="h-3 w-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {/* Hidden input for form validation */}
                                                    <input type="hidden" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormDescription>
                                                Add hashtags to help categorize your video. Click the +
                                                button or press Enter to add tags.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Video File Upload */}
                                <FormField
                                    control={form.control}
                                    name="video"
                                    render={({ field: { onChange, ...field } }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Video className="h-4 w-4" />
                                                Video File
                                            </FormLabel>
                                            <FormControl>
                                                <div className="space-y-2">
                                                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                                                        <Input
                                                            id="video-upload"
                                                            type="file"
                                                            accept="video/*"
                                                            onChange={(e) => onChange(e.target.files)}
                                                            disabled={isSubmitting}
                                                            className="hidden"
                                                        />
                                                        <label
                                                            htmlFor="video-upload"
                                                            className="cursor-pointer flex flex-col items-center space-y-1"
                                                        >
                                                            <Video className="h-8 w-8 text-muted-foreground" />
                                                            <div className="text-sm font-medium">
                                                                Click to upload video
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                MP4, MOV, AVI up to 100MB
                                                            </div>
                                                        </label>
                                                    </div>

                                                    {selectedFileName && (
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-2 rounded-md">
                                                            <Video className="h-3 w-3" />
                                                            <span className="truncate font-medium">
                                                                {selectedFileName}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                Upload your video file (Max size: 100MB). Supported
                                                formats: MP4, MOV, AVI, etc.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Submit Button - Full Width */}
                        <div className="pt-3 border-t">
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full"
                                size="lg"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload Video
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
};

export default VideoForm;