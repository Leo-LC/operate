import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/" },
});

export const config = {
  matcher: [
    "/(home|reviews|scheduling|attendance|payments|animals|documents|accounting|reports|contacts|wiki|brand|admin)(.*)",
  ],
};
