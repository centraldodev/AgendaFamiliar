import { useState } from "react";
import { login } from "../services/auth/login";
import { registerAccount } from "../services/auth/registerAccount";
import { resetPassword } from "../services/auth/resetPassword";
export function useAuthController(notify: (message: string) => void) {
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const submit = async () => {
    if (register) await registerAccount(email, password, name);
    else await login(email, password);
  };
  const recoverPassword = async () => {
    await resetPassword(email);
    notify("Confira seu e-mail para redefinir a senha.");
  };
  return {
    register,
    setRegister,
    email,
    setEmail,
    password,
    setPassword,
    name,
    setName,
    submit,
    recoverPassword,
  };
}
