"use server";
import { headers, cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";


export const getCurrentUser = cache(async () => {
    const session = await auth.api.getSession({
        headers: await headers(),
    })
    return session?.user ?? null
})

export async function requireAuth() {
    const user = await getCurrentUser();
    if (!user) {
        redirect('/sign-in')
    }
    return user;
}


export async function requireUnAuth() {
    const user = await getCurrentUser();
    if (user) {
        redirect('/')
    }
}


export async function signIn(callbackURL = '/', provider: "github" | "google") {
    const result = await auth.api.signInSocial({
        body: {
            provider,
            callbackURL,
            disableRedirect: true,
        },
        headers: await headers()
    })
    return result.url
}

export async function signOut() {
    await auth.api.signOut({
        headers: await headers()
    })
    // The server deletes the session row, but the browser cookie would linger
    // and keep the proxy middleware believing the user is signed in (which
    // bounced the sign-in page back to "/" in a loop). Clear it explicitly.
    const cookieStore = await cookies();
    for (const name of [
        "better-auth.session_token",
        "__Secure-better-auth.session_token",
        "better-auth.session_data",
        "__Secure-better-auth.session_data",
        "better-auth.dont_remember",
        "__Secure-better-auth.dont_remember",
    ]) {
        cookieStore.delete(name);
    }
    redirect('/sign-in')
}