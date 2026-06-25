-- Las cuentas que ya existían antes de exigir verificación de correo se
-- consideran verificadas, para no bloquear su acceso. Las cuentas nuevas se
-- crean con emailVerified = NULL y deben confirmar el correo para entrar.
UPDATE "User" SET "emailVerified" = NOW() WHERE "emailVerified" IS NULL;
