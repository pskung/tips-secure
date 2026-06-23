import { z } from "zod";

const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const DonateInputSchema = z.object({
  name: z
    .string()
    .min(2, "Invalid nickname. Please check again.")
    .max(25, "Invalid nickname. Please check again.")
    .regex(
      /^[a-zA-Z0-9\u0e00-\u0e7f\s._-]+$/,
      "Invalid nickname. Please check again.",
    ),
  amount: z.coerce
    .number()
    .min(10.0, "Donation amount must be between 10 and 100,000 THB.")
    .max(100000.0, "Donation amount must be between 10 and 100,000 THB."),
  message: z
    .string()
    .max(255, "Message cannot exceed 255 characters.")
    .optional()
    .or(z.literal("")),
  is_consented: z.boolean().refine((val) => val === true, {
    message: "You must agree to the Terms & Policy to continue.",
  }),
  email_confirm: z.string().optional().or(z.literal("")),
  turnstile_token: z
    .string()
    .min(1, "Please complete the security verification."),
  render_time: z.coerce.number().optional(),
});

export const ThemeSchema = z.object({
  mainFontFamily: z.string().min(1, "Please specify the main font family."),
  vtuberName: z.string().min(1, "Please specify the streamer name."),
  welcomeText: z.string().min(1, "Please enter the welcome text."),
  nicknamePlaceholder: z.string().optional().or(z.literal("")),
  messagePlaceholder: z.string().optional().or(z.literal("")),
  submitBtnText: z.string().optional().or(z.literal("")),
  supportEmail: z.string().optional().or(z.literal("")),
  bgType: z.enum(["solid", "image"]),
  bgColor: z.string().regex(hexColorRegex, "Invalid background color format."),
  cardBgColor: z
    .string()
    .regex(hexColorRegex, "Invalid container background color format."),
  generalTextColor: z
    .string()
    .regex(hexColorRegex, "Invalid general text color format."),
  inputBgColor: z
    .string()
    .regex(hexColorRegex, "Invalid input background color format."),
  inputTextColor: z
    .string()
    .regex(hexColorRegex, "Invalid input text color format."),
  submitBtnColor: z
    .string()
    .regex(hexColorRegex, "Invalid button background color format."),
  submitBtnTextColor: z
    .string()
    .regex(hexColorRegex, "Invalid button text color format."),
  avatarUrl: z.string().optional().or(z.literal("")),
  bannerUrl: z.string().optional().or(z.literal("")),
  bgUrl: z.string().optional().or(z.literal("")),
  nameColor: z.string().regex(hexColorRegex).optional().or(z.literal("")),
  inputBorderColor: z
    .string()
    .regex(hexColorRegex)
    .optional()
    .or(z.literal("")),
  cardBorderColor: z.string().regex(hexColorRegex).optional().or(z.literal("")),
  presetBorderColor: z
    .string()
    .regex(hexColorRegex)
    .optional()
    .or(z.literal("")),
  youtubeUrl: z.string().optional().or(z.literal("")),
  twitchUrl: z.string().optional().or(z.literal("")),
  discordUrl: z.string().optional().or(z.literal("")),
  xUrl: z.string().optional().or(z.literal("")),
  facebookUrl: z.string().optional().or(z.literal("")),
  instagramUrl: z.string().optional().or(z.literal("")),
  tiktokUrl: z.string().optional().or(z.literal("")),
  presetAmounts: z
    .array(z.number().min(10).max(100000))
    .length(4, "Must specify exactly 4 preset amounts."),
  minDonationAmount: z.number().min(10).max(100000).optional(),
});

export type DonateInput = z.infer<typeof DonateInputSchema>;
export type ThemeConfig = z.infer<typeof ThemeSchema>;
